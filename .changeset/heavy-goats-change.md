---
"@qwikdev/create-astro": patch
---

### 🚀 Patch Changes

- **🔄 Default Value for Overwriting Existing Directory**:  
  The default value for overwriting an existing directory is now set to `false`. This ensures that users must explicitly confirm overwriting a directory, preventing accidental data loss. 🎯

- **📂 Default Project Destination Path**:  
  The default destination path for new projects has been updated to `./qwik-astro-app` instead of `.` or `./`. This provides a more intuitive approach, creating a dedicated folder for the new project rather than placing it directly in the current directory. 📁

- **🐞 Bug Fixes**:  
  Fixed several issues related to the execution of the CLI, ensuring a smoother user experience and better stability. 🛠️

- **🌟 Support for Astro Templates**:  
  Introduced the `--template` or `-t` argument to allow users to start a project from a specific Astro template, with Qwik configured on top. This adds flexibility for users looking to customize their projects right from the start. ✨
