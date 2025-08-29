import { chromium } from "playwright";
import fs from "fs-extra";
import { GoogleGenerativeAI } from "@google/generative-ai";
import readline from "readline";

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => rl.question(query, (ans) => {
    rl.close();
    resolve(ans.trim());
  }));
}

//will read from userData.json internally
async function fillFormWithAI(page, model) {
  // read userData for resume/details
  const userData = await fs.readJson("userData.json");
  const resume = userData.resumeStructured;
  const details = userData.details || {};

  // get element metadata in page order (inputs, textareas, selects)
  const elements = await page.$$eval("input, textarea, select", (els) =>
    els.map((el, i) => {
      const labelByFor = el.id ? document.querySelector(`label[for="${el.id}"]`) : null;
      const closestLabel = el.closest && el.closest("label");
      return {
        index: i,
        tag: el.tagName.toLowerCase(),
        type: el.type || null,
        name: el.name || null,
        id: el.id || null,
        placeholder: el.placeholder || null,
        ariaLabel: el.getAttribute && el.getAttribute("aria-label"),
        labelText: labelByFor ? labelByFor.innerText : closestLabel ? closestLabel.innerText : null,
      };
    })
  );

  if (!elements.length) {
    console.log("No form controls (input/textarea/select) found on the page.");
    return;
  }

  // prompt the model to map resume + details -> values for each element (index aligned)
  const prompt = `
You are a helpful assistant that fills web forms for job applications.
Use the provided resume and personal details to choose the best answers for each form control.
Resume (JSON): ${JSON.stringify(resume, null, 2)}

Personal details (JSON): ${JSON.stringify(details || {}, null, 2)}

The form contains ${elements.length} elements. Here are their metadata objects (index matches DOM order):
${JSON.stringify(elements, null, 2)}

Return ONLY valid JSON with the shape:
{ "values": [ v0, v1, v2, ... ] }
where values[i] is the string/value to set for element at index i. 
- For text inputs/textarea return the text to fill.
- For select return the option value to select.
- For checkboxes/radio return true/false.
Be concise and pick the best reasonable mapping from the resume and personal details.
`;

  let aiText;
  try {
    const result = await model.generateContent(prompt);
    aiText = result.response.text();
  } catch (err) {
    throw new Error("AI generation failed: " + (err.message || err));
  }

  // Attempt to extract JSON from AI reply
  let mapping;
  try {
    mapping = JSON.parse(aiText);
  } catch {
    // try to find JSON substring
    const m = aiText.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        mapping = JSON.parse(m[0]);
      } catch (e) {
        // fall through
      }
    }
  }
  if (!mapping || !Array.isArray(mapping.values)) {
    throw new Error("AI did not return a valid JSON mapping. Response was:\n" + aiText);
  }

  // get handles in same order
  const handles = await page.$$("input, textarea, select");

  for (let i = 0; i < handles.length; i++) {
    const handle = handles[i];
    const el = elements[i];
    const val = mapping.values[i];

    if (val === null || typeof val === "undefined") continue;

    try {
      if (el.tag === "select") {
        // try selectOption with string value
        await handle.selectOption(String(val));
      } else if (el.tag === "input") {
        const t = (el.type || "").toLowerCase();
        if (t === "checkbox" || t === "radio") {
          // set checked state
          const shouldCheck = !!val;
          await page.evaluate(
            (el, checked) => {
              el.checked = checked;
              el.dispatchEvent(new Event("change", { bubbles: true }));
            },
            handle,
            shouldCheck
          );
        } else {
          await handle.fill(String(val));
        }
      } else if (el.tag === "textarea") {
        await handle.fill(String(val));
      } else {
        // fallback: set value property
        await page.evaluate((el, v) => {
          el.value = v;
          el.dispatchEvent(new Event("input", { bubbles: true }));
        }, handle, String(val));
      }
      console.log(`Filled element #${i} (${el.tag}${el.name ? " name="+el.name : el.id ? " id="+el.id : ""})`);
    } catch (err) {
      console.log(`Failed to fill element #${i}:`, err && err.message ? err.message : err);
    }
  }
}

// Exported function so jobtool.js can call it directly
// changed: signature simplified to (url, options={})
async function applyToJob(url, options = {}) {
  // Always load userData from disk
  let userData;
  try {
    userData = await fs.readJson("userData.json");
  } catch (err) {
    console.error("userData.json not found. Please run the setup to create it: node setup.js");
    process.exit(1);
  }

  // If structured resume or personal details are missing, instruct user to run setup and exit
  if (!userData.resumeStructured || !userData.details) {
    console.error("userData.json exists but is missing required data (structured resume or personal details).");
    console.error("Please run 'node setup.js' to create/update your data, then re-run 'node apply.js'.");
    process.exit(1);
  }

  const resume = userData.resumeStructured;
  if (!resume) {
    console.error("Structured resume still missing after setup. Aborting.");
    process.exit(1);
  }

  // Setup Gemini
  const genAI = new GoogleGenerativeAI(userData.apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  // If a page is provided in options, use it; otherwise open a persistent visible Chrome
  let context;
  let page;
  if (options.page) {
    page = options.page;
  } else {
    const userDataDir = "./playwright-profile";
    console.log("Launching visible Chrome (will remain open for review)...");
    context = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      channel: "chrome",
      devtools: true,
      slowMo: 50,
      args: ["--start-maximized"],
    });
    const pages = context.pages();
    page = pages.length ? pages[0] : await context.newPage();
    await page.bringToFront();
  }

  // Validate URL (so page is already visible when navigation occurs)
  try {
    new URL(url);
  } catch (err) {
    console.error("wrong url try again bruh.");
    return { ok: false, reason: "invalid-url" };
  }

  // Navigate to URL; do NOT close the browser on failure so you can inspect
  try {
    const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
    if (!response || response.status() >= 400) {
      console.error(`Failed to load page (status: ${response ? response.status() : "no response"}). The browser is open for inspection.`);
      return { ok: false, reason: "navigation-failed" };
    }
  } catch (err) {
    console.error("I couldn't access the url :( The browser is open for inspection. Error:", err.message || err);
    return { ok: false, reason: "navigation-error" };
  }

  // Use AI to detect and fill form controls
  try {
    // changed: no resume/details arguments, helper will read userData itself
    await fillFormWithAI(page, model);
  } catch (err) {
    console.error("AI-driven autofill failed:", err && err.message ? err.message : err);
    return { ok: false, reason: "ai-failed" };
  }

  console.log("🎉 AI autofill complete. Please review before submitting. The browser remains open for inspection.");
  return { ok: true };
}

// If this file is run directly, open browser first, wait for "go", then apply
if (process.argv[1] && process.argv[1].endsWith("apply.js")) {
  (async () => {
    // Accept argv[2] if provided, otherwise prompt for URL
    let url = process.argv[2];
    if (!url) {
      url = await askQuestion("Give me the exact url of where u want me to apply: ");
    }

    // Launch visible browser and navigate immediately so user can inspect before "go"
    const userDataDir = "./playwright-profile";
    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      channel: "chrome",
      devtools: true,
      slowMo: 50,
      args: ["--start-maximized"],
    });
    const pages = context.pages();
    const page = pages.length ? pages[0] : await context.newPage();
    await page.bringToFront();

    // Try navigating now so you can inspect page visually before starting
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
    } catch (err) {
      console.log("Navigation may have failed; you can inspect the open browser. Error:", err && err.message ? err.message : err);
    }

    // wait for user to type "go"
    while (true) {
      const ans = await askQuestion('Type "go" to start AI autofill (or exit): ');
      if (ans.toLowerCase() === "go") break;
      if (ans.toLowerCase() === "exit") {
        console.log("Exiting. Browser remains open for manual inspection.");
        process.exit(0);
      }
      console.log('Unrecognized input. Type "go" to proceed or "exit" to quit.');
    }

    try {
      // reuse the already-open page by passing it as option
      await applyToJob(url, { page });
    } catch (err) {
      console.error("i failed ;( :", err && err.message ? err.message : err);
      process.exit(1);
    } 
  })();
}


