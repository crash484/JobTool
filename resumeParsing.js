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
    //then creating object to store it file
    const structured = JSON.parse(text);

    userData.resumeStructured = structured;
    await fs.writeJson("userData.json",userData,{ spaces:2 });

    console.log("resume parsed and saved");
}

resumeParsing();