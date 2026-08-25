# Prompt & Spec Guide for Generating an Interactive GitHub Projects Portfolio / Organizer (HTML/CSS/JS)

Use this guide to instruct **Gemini** (or any LLM) to generate a customized, single-file HTML project organizer / Table of Contents webpage for a GitHub repository.

---

## 🚀 Quick Prompt Template (Copy & Paste to Gemini)

> **Prompt:**
> "Act as a senior front-end web developer. I want you to create a single-file `index.html` file that serves as a Table of Contents and Project Organizer for my GitHub Pages repository.
> 
> Here are my requirements:
> 1. **Modular Subsections / Folders:** I want clear sections for my projects (e.g., `Section 1`, `Section 2`, `Section 3`). Each section will correspond to relative folder paths in my repo (e.g., `./Section1/project1.html`).
> 2. **Fully Customizable & Renameable:** Make all title text, folder paths, category names, icons, tags, and link descriptions extremely easy to edit and rename near the top of the HTML or in a dedicated JS config object / clean HTML template.
> 3. **Modern Visual Design:** Clean, responsive, and visually appealing design (dark/light theme or modern sleek aesthetic, smooth animations, visual card layouts or interactive folder tree, search bar, and category filters).
> 4. **Embedded Assets:** All CSS and JavaScript must be inline within the single `.html` file (no external file dependencies except optional standard web fonts or CDN icons like FontAwesome).
> 5. **Interactive Features:** Include a live search/filter bar to filter projects by name or tag, collapsible folder/section accordions, and quick 'Open Project' links.
> 
> Please generate the full production-ready `index.html` code."

---

## 📐 Architecture & Features Specification

When building or updating your portfolio organizer file, ensure the HTML code adheres to this structural breakdown:

### 1. Folder & File Structure (GitHub Repository)
Your GitHub repository layout will look something like this:

```text
my-github-repo/
│
├── index.html                  <-- The generated Table of Contents / Hub file
│
├── Section 1/                  <-- Project Category Folder (e.g., Rename to "3D_PROJECTS")
│   ├── project1.html           <-- Individual Project HTML
│   └── project2.html
│
├── Section 2/                  <-- Project Category Folder (e.g., Rename to "2D_PROJECTS")
│   ├── graphic_design.html
│   └── animation.html
│
└── Section 3/                  <-- Project Category Folder (e.g., Rename to "WEB_APPS")
    └── demo.html
```

---

## 🛠️ How to Customize and Rename Elements

The generated HTML file is structured so you can easily modify section names, directory paths, project names, and links directly in the code.

### A. Renaming Categories & Folder Paths
In the HTML structure, find the section headers and update both the **display title** and the **relative link target**:

```html
<!-- ========================================================= -->
<!-- SECTION 1 (Example: Rename "Section 1" to "3D PROJECTS")  -->
<!-- ========================================================= -->
<section class="project-section" data-category="3d-projects">
  <div class="section-header">
    <span class="folder-icon">📁</span>
    <!-- Change section title here -->
    <h2>3D PROJECTS</h2> 
    <span class="folder-path">./3D_PROJECTS/</span>
  </div>

  <div class="project-grid">
    <!-- Project Card 1 -->
    <div class="project-card">
      <h3>Solar System Simulation</h3>
      <p>Interactive 3D planetary orbit visualizer built with Three.js.</p>
      <!-- Update relative file path below -->
      <a href="./3D_PROJECTS/solar_system.html" class="btn-link" target="_blank">View Project ↗</a>
    </div>
  </div>
</section>
```

### B. JavaScript Data-Driven Alternative (Optional Dynamic Setup)
If you prefer managing all your projects from a single JavaScript configuration block at the top of the `<script>` tag:

```javascript
const PORTFOLIO_CONFIG = {
  title: "My GitHub Project Hub",
  subtitle: "Directory & Portfolio Organizer",
  sections: [
    {
      id: "section-1",
      title: "3D PROJECTS",       // <-- Rename category here
      folderPath: "3D_PROJECTS",   // <-- Rename directory here
      description: "WebGL, Three.js, and Blender renders",
      projects: [
        {
          name: "Solar System",
          file: "solar_system.html", // Relative path: ./3D_PROJECTS/solar_system.html
          description: "Interactive 3D simulation",
          tags: ["Three.js", "WebGL"]
        },
        {
          name: "Low Poly Island",
          file: "island.html",
          description: "3D stylized environment",
          tags: ["Blender", "Canvas"]
        }
      ]
    },
    {
      id: "section-2",
      title: "2D PROJECTS",       // <-- Rename category here
      folderPath: "2D_PROJECTS",   // <-- Rename directory here
      description: "Canvas games, UI designs, and digital art",
      projects: [
        {
          name: "Pixel Platformer",
          file: "game.html",
          description: "HTML5 Canvas platform game",
          tags: ["2D", "JavaScript"]
        }
      ]
    },
    {
      id: "section-3",
      title: "UTILITIES & TOOLS", // <-- Rename category here
      folderPath: "UTILITIES",    // <-- Rename directory here
      description: "Web apps and productivity tools",
      projects: [
        {
          name: "Color Palette Generator",
          file: "palette.html",
          description: "Extract color swatches from images",
          tags: ["Tool", "UI"]
        }
      ]
    }
  ]
};
```

---

## 🎨 Recommended UI / UX Features for Gemini to Implement

When asking Gemini to generate the HTML code, ensure it includes these UI features:

1. **Live Search Bar:** Filter projects instantaneously by typing keywords or file names.
2. **Category Filter Tabs:** Quickly toggle visibility between `All`, `Section 1`, `Section 2`, `Section 3`, etc.
3. **Collapsible Section Folders:** Clickable accordion headers that expand/collapse folder views (`📁 Section 1` -> `📂 Section 1`).
4. **Relative Path Tooltips:** Clear visual indicators of the relative URL path (`./Section_Name/file.html`) for easy debugging.
5. **Dark / Light Mode Toggle:** Seamless theme switching with local storage memory.
6. **Responsive Layout:** CSS Grid/Flexbox layout that adjusts smoothly for desktop, tablet, and mobile viewing.

---

## 📝 Step-by-Step GitHub Setup Instructions

1. **Create the Repository:** Create a new GitHub repo (or use an existing one).
2. **Add Your File:** Upload or create `index.html` at the root level of your repository.
3. **Create Category Folders:** Create subfolders matching your section names (e.g., `3D_PROJECTS/`, `2D_PROJECTS/`, `WEB_APPS/`).
4. **Add Sub-Projects:** Place your HTML project files inside their respective category folders.
5. **Enable GitHub Pages:**
   * Go to `Settings` > `Pages`.
   * Under **Source**, select `Deploy from a branch`.
   * Set Branch to `main` (or `master`) and folder to `/ (root)`.
   * Save and wait a minute for GitHub to publish your site!
