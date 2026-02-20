# Missing Features vs. Trello & Jira

## What We Already Have

- Kanban board with drag-and-drop, columns, categories
- Task details: priority, due/start dates, assignee, cover image, labels, checklists, attachments, comments
- Gantt chart view
- KPI/analytics (bar, line, pie charts; overdue, by-member, completion trend)
- Board sharing & member management
- Auth, admin panel, role-based access
- Real-time updates, auto-move/auto-delete automations
- Dark/light theme, board backgrounds

---

## Missing Trello Features

| Feature | Notes |
|---|---|
| **Calendar view** | View all tasks with due dates on a monthly calendar |
| **Table/List view** | Spreadsheet-like view of all cards across columns |
| **Board templates** | Pre-built layouts (e.g., Scrum, Marketing, Bug Tracker) |
| **Voting on cards** | Members upvote/downvote cards |
| **Card watching/subscriptions** | Follow a card for updates without being assigned |
| **Automation rules (Butler-like)** | "When card moved to X, set due date / notify member / add label" |
| **Workspace-level views** | Cross-board views aggregating tasks from all boards |
| **Card aging** | Cards visually fade if untouched for a period |
| **Stickers/reactions** | Add emoji reactions or stickers to cards |
| **Email-to-board** | Create cards by sending an email to a board address |

---

## Missing Jira Features

| Feature | Notes |
|---|---|
| **Sprints & Backlog** | Sprint planning with a dedicated backlog queue, sprint start/end |
| **Issue hierarchy** | Epic → Story → Task → Subtask parent-child relationships |
| **Issue types** | Distinguish Bug, Story, Task, Epic, Subtask with icons/fields |
| **Story points / estimation** | Numeric effort estimate per task |
| **Dependencies / issue links** | "Blocks", "is blocked by", "relates to", "duplicates" between tasks |
| **Burndown & velocity charts** | Sprint-level charts tracking remaining work over time |
| **Custom fields** | Admin-defined fields (e.g., environment, browser, severity) |
| **Advanced search / filters** | Query-language-style filtering with saveable named filters |
| **Time tracking / work logging** | Log hours spent, remaining estimate per task |
| **Versions & releases** | Tag tasks to a release version; track what ships in v1.2, etc. |
| **Components** | Sub-project grouping of tasks (e.g., "Frontend", "API", "DB") |
| **Bulk actions** | Select multiple tasks and update priority/assignee/column at once |
| **Notifications & @mentions** | In-app and email alerts when mentioned or assigned |
| **CSV import / export** | Import existing tasks or export for reporting |
| **Roadmap / timeline planning** | Cross-sprint, cross-epic high-level planning view |
| **Customizable workflows** | Define allowed column transitions with conditions (e.g., can't move to "Done" without a linked PR) |

---

## Priority Recommendations

The highest-impact gaps relative to the project management use case:

1. **Sprints & Backlog** — core to any agile workflow
2. **Issue hierarchy (Epics)** — needed for large project scoping
3. **Dependencies** — "blocks / blocked by" between tasks
4. **Notifications & @mentions** — real-time team awareness
5. **Bulk actions** — productivity for large boards
6. **Custom fields** — flexibility for different team workflows
