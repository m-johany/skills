# Claims ledger: Quillmoor (placeholder example)

Quillmoor is fictional, so the "app" each claim is checked against is the placeholder content: the two generated screens and the chat text in `content.md`. In a real case study the evidence column names the running app's screen, route, file or reply string.

| Claim on the page | Surface | Evidence |
| :--- | :--- | :--- |
| Problem: a paper sign-out sheet only shows the shelf to someone standing next to it | Problem statement | Confirmed in the placeholder brief; describes the situation, not the app |
| Members reserve tools by text | Text chat | Chat step 1: the reservation reply |
| Members reserve from the shelf | Web, shelf | `screens/shelf.png`: Reserve button on available tools |
| Each reservation comes with a pick-up time and place | Text chat | Chat step 1: "pick-up 10:00–12:00", "Elm Street shed" |
| Reserve, cancel or join a waitlist by text | Text chat | Chat step 1 ("Reply CANCEL to cancel") and step 3 ("Reply WAIT to join the waitlist") |
| Volunteers get each pick-up by text and mark it ready | Text chat | Chat step 2: New pick-up message with a Ready button |
| A volunteer marks the tool ready; the member collects it from the shed | Text chat | Chat step 2 (Ready button); chat step 1 (pick-up place) |
| Every tool with its status: available, on loan, or waitlisted | Web, shelf | `screens/shelf.png`: Available, On loan and Waitlist chips |
| Members queue for a tool that is out, in the order they joined | Web, tool page | `screens/tool.png`: numbered waitlist with join days |
| Whether the tool is in, and when a loan is due back | Web, tool page | `screens/tool.png`: Status and Due back rows |
| Where to collect the tool | Web, tool page | `screens/tool.png`: Pick-up row |
| Each tool's page keeps notes on wear and safety | Web, tool page | `screens/tool.png`: Condition notes panel |
| The tool's page keeps its recent loans | Web, tool page | `screens/tool.png`: Recent loans list |
| A loan goes from the shelf, to the shed, and back | Web and text | Reserve on `screens/shelf.png`, pick-up in chat step 2, "returned" entries on `screens/tool.png` |
| The tile cutter is out until Thu 12 Mar | Text chat, demo data | Chat step 3 reply; matches the tool page's due date |
