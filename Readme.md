````markdown
# Jobtool

A small Node.js utility that helps automate job applications by parsing your resume and using an AI assistant to fill web application forms.  
The tool opens a visible Chrome window so you can watch and review every step.

---

## How it works (simple)

1. Collects your profile and preferences via the setup script (`setup.js`), saved to `userData.json`.
2. Parses your resume into structured data (`resumeParsing.js`).
3. Opens the target job application page in a real Chrome window and, when you confirm, uses an AI model to map your resume to form fields and fill them automatically (`apply.js`).
4. The browser remains open for review before you submit.

---

## How to use

```bash
# 1. Clone the repository:
git clone https://github.com/crash484/JobTool
cd Jobtool
````

```bash
# 2. Install Node dependencies:
npm install
```

```bash
# 3. Install Playwright browsers:
npx playwright install
```

```bash
# 4. Copy your resume into the cloned directory :
cp /path/to/your/resume.pdf ./resume.pdf
```

```bash
# 5. Run the setup to create or update your user data:
node setup.js
```

```bash
# 6. Parse your resume :
node resumeParsing.js
```

```bash
# 7. Run the apply script (it will open Chrome; you can also pass the URL as an argument):
node apply.js
```

* If you don't pass a URL, the script will prompt for one.
* Once the page is open, type `"go"` at the prompt to let the AI autofill the form.


## Notes and tips

* The `apply.js` script opens a **visible Chrome window** and waits for you to type `"go"` before filling the form. This ensures you can inspect and intervene.
* Keep your `resume.pdf` file in the project folder or provide the correct path when parsing.
* Make sure your **API key** is set during setup or saved in `userData.json`.
* The browser session data is stored in `./playwright-profile` (this folder is ignored by `.gitignore`).
* Always review all autofilled content before submitting any application.

---

## Future
* Better error handling for missing user data or resume.
* will add GUI 

---

