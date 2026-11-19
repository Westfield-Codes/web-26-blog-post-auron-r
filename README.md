# My_assignments

## Assignment Tracker

This static page lets you add, edit, and delete assignments. Class tabs are
created from the course names in your assignment data; choose a class to see
its assignments in a condensed list, then select an assignment to expand its
rows for the name, due date, status tag, links, notes, and points. The
notification count in the top bar opens updates for overdue assignments and
assignments due within five days. Turned-in assignments are excluded from
updates and downloaded backups. Assignments may also have multiple category
tags: PR (Project), TE (Test), and Ma (Major assignment).

Use **Add assignment** in the top bar to open the form. Entries are stored in
this browser and remain available between visits; they are not synced to other
devices.

Use **Download backup** to save a JSON copy of your assignments. **Restore
backup** imports a JSON copy and replaces the assignments currently stored in
this browser. Keep backups somewhere safe if the assignments are important or
if you want to move them to another device.

Browser storage does not expire automatically, but clearing the browser's site
data can erase it. No storage method in a static page can guarantee against
device loss or browser data being cleared.

To run locally, serve this folder (for example, run `python3 -m http.server
8000` here) and open `http://localhost:8000`.
