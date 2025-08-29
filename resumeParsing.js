import fs from "fs-extra";
import { GoogleGenerativeAI } from "@google/generative-ai"

async function resumeParsing() {
    const userData = await fs.readJson("userData.json");
    const genAI = new GoogleGenerativeAI(userData.apiKey);
    const model = genAI.getGenerativeModel({model: "gemini-2.5-flash"});

    const prompt = `
        Extract structured information from this resume text:
        ${userData.resumeRaw}

        Format as JSON with fields: name, email, phone, skills, experience, education, projects.
        `;

    const result = await model.generateContent(prompt);
    //cleaning the response 

    let text = result.response.text();
    text = text.replace(/```json|```/g,'').trim();

    // parse AI output safely
    let structured;
    try {
      structured = JSON.parse(text);
    } catch (err) {
      console.error("Failed to parse AI output as JSON:", err.message || err);
      console.error("AI output:\n", text);
      return;
    }

    userData.resumeStructured = structured;

    // merge contact fields into details, preserving existing entries
    userData.details = userData.details || {};
    if (structured.name) userData.details.name = structured.name;
    if (structured.email) userData.details.email = structured.email;
    if (structured.phone) userData.details.phone = structured.phone;

    await fs.writeJson("userData.json",userData,{ spaces:2 });

    console.log("resume parsed and saved ur welcome");
}

resumeParsing();