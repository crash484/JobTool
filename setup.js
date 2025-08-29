import inquirer from 'inquirer';
import fs from "fs-extra";
import pkg from "pdf-parse";
import path from "path";

const pdf = pkg; //pdf-farse function

async function setup() {
  try {
    // the prompt 
    const answers =await inquirer.prompt([
      { type: "input", name: "apiKey", message: "Enter your Gemini API key:" },
      { type: "input", name: "resumePath", message: "Enter path to your resume:" }
    ]);

    // Prompt for additional personal details
    const details = await inquirer.prompt([
      { type: "input", name: "address", message: "Enter your address (optional):" },
      { type: "input", name: "Registration/application number", message: "Enter your Registration or application number:" },
      { type: "list", name: "gender", message: "Select your gender:", choices: ["Male", "Female", "Other", "Prefer not to say"], default: "Prefer not to say" }
    ]);

    // attach details to answers
    answers.details = details;

    // resolve resume path to absolute
    answers.resumePath = path.resolve(answers.resumePath);

    await parseResume(answers);

  } catch (err) {
    oops(err);
  }
}

async function parseResume(answers) {
  try {
    if (!(await fs.pathExists(answers.resumePath))) {
      throw new Error("cant find ur resume bro" + answers.resumePath);
    }

    const dataBuffer = await fs.readFile(answers.resumePath);
    const pdfData = await pdf(dataBuffer);

    const userData = {
      apiKey: answers.apiKey,
      resumeRaw: pdfData.text,
      resumePath: answers.resumePath,
      details: answers.details
    };

    await fs.writeJson("userData.json", userData, { spaces: 2 });

    console.log("Stored API key, resume, and details.");
  } catch (err) {
    oops(err);
  }
}

function oops(err) {
  console.log("Wrong input dummy!", err?.message || "");
}

setup();
