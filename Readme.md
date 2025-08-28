# Jobtool

A small Node.js utility that helps automate job applications by parsing your resume and using an AI assistant to fill web application forms. The tool opens a visible Chrome window so you can watch and review every step.

How it works (simple)
- Collects your profile and preferences via the setup script (saved to userData.json).
- Parses your resume into structured data (resumeParsing.js).
- Opens the target job application page in a real Chrome window and, when you confirm, uses an AI model to map your resume to form fields and fill them automatically (apply.js).
- The browser remains open for review before you submit.

How to use 
(bash)
1. Clone the repository:
   git clone <REPO_URL>
   cd Jobtool

2. Install Node dependencies:
   npm install

3. Install Playwright browsers:
   npx playwright install

4. Copy your resume into the cloned directory (example):
   cp /path/to/your/resume.pdf ./resume.pdf

5. Run the setup to create or update your user data (interactive):
   node setup.js

6. Parse your resume (adjust file path if needed):
   node resumeParsing.js ./resume.pdf

7. Run the apply script (it will open Chrome; you can also pass the URL as an argument):
   node apply.js
   - If you don't pass a URL, the script will prompt for one.
   - Once the page is open, type "go" at the prompt to let the AI autofill the form.

Optional: Run the orchestrator (if present) to handle setup/parse/apply in sequence:
   node jobtool.js

Notes and tips
- The apply script opens a visible Chrome window and waits for you to type "go" before filling the form. This ensures you can inspect and intervene.
- Keep your resume file in the project folder or provide the correct path when parsing.
- Make sure your API key is set during setup or saved in userData.json.
- The browser session data is stored in ./playwright-profile (this folder is ignored by .gitignore).
- Review all autofilled content before submitting any application.

If you need the README adjusted for additional details (example inputs, environment variables, or CI instructions), tell me what to add.