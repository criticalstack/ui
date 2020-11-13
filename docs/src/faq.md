# Frequently Asked Questions

General:
- Ensure that docker is installed and that the docker daemon is running. Your
   current user must have permission to interact with docker (e.g. you have the
   `docker` group).
- Sometimes you need to start fresh, run `make cinder-cleanup` to delete your local cinder cluster.

How do I ...?

- Download A Kubeconfig
  - The dropdown menu to the left of the Critical Stack logo contains a link to download a kubeconfig. See [Dex](/design.md#dex) for a visualization of downloading a kubeconfig.
- Change My Password
   - To change your own password, navigate to the dropdown menu to the left of the Critical Stack logo and select "Settings". From the "User Profile" tab select "Password" and enter your old password and your new password. An administrator can change your password by selecting "Manage Users" in "Settings", right-clicking on your user, and selecting "Reset Password".
- Change My Default Namespace
   - Navigate to the dropdown menu to the left of the Critical Stack logo and select "Settings". From the "User Profile" tab select "Change Default Namespace" and select your new default namespace from the dropdown menu.
- Change Section Editor Modes
   - Navigate to the dropdown menu to the left of the Critical Stack logo and select "Settings". Under "User Interface" select "Section Editor". On this screen you can change the editor font size, the editor format (YAML or JSON), and the editor mode (vim or emacs).
- Change The Default Kubeconfig Template
   - In the critical-stack namespace select Data Center, then navigate to "Config" -> "Config Maps". Right-click on kubeconfig-template and select "Edit".
- [Add Marketplace Applications Directly](/features/marketplace.md#adding-applications-directly)



Why ...?
- hack/tools/bin
- websocket problems
