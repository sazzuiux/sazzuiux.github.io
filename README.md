# sazzuiux.github.io

Portfolio of **Sazzadul Kabir (Sazzuiux)** — live at https://sazzuiux.github.io

Plain HTML/CSS/JS, no framework and no build server. GitHub Pages serves the repo root.

## Edit content

- Text for services, projects, process steps and resume jobs: `src/data.json`
- Page layouts: `src/index.html`, `src/resume.html`, shared parts in `src/partials/`
- Styles: `assets/css/style.css` · Interactions: `assets/js/main.js`

After editing anything in `src/`, rebuild the pages:

```bash
python3 tools/build.py
```

Then commit and push — the site updates in about a minute.

## Contact form

Uses [FormSubmit](https://formsubmit.co) (free, no backend). The first message sends an
activation email to sazzuxui@gmail.com — click the link once to start receiving inquiries.
