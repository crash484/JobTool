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
      throw new Error("Resume file not found at " + answers.resumePath);
    }

    const dataBuffer = await fs.readFile(answers.resumePath);
    const pdfData = await pdf(dataBuffer);

    const userData = {
      apiKey: answers.apiKey,
      resumeRaw: pdfData.text,
    };

    await fs.writeJson("userData.json", userData, { spaces: 2 });

    console.log("Stored API key and resume locally.");
  } catch (err) {
    oops(err);
  }
}

function oops(err) {
  console.log("Wrong input dummy!", err?.message || "");
}

setup();
