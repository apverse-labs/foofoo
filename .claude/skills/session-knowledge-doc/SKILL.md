---
name: session-knowledge-doc
description: >
  Maintains a living HTML knowledge book for a software project built with AI assistance.
  MUST be used at the end of every Claude Code session — no exceptions — to record what
  was built, changed, touched, or decided. Also use at the start of a session when the
  user says "catch me up", "what did we build", "what's the current state", or opens the
  knowledge book. Multiple developers or AI sessions on the same project all write to the
  same HTML file, so the knowledge book is always the single source of truth.

  Trigger on any of: "end of session", "session done", "wrap up", "document what we built",
  "update the knowledge book", "what did we build", "catch me up", "show me the project state",
  or automatically at natural session close when significant code/DB/config work was done.
---

# Session Knowledge Doc Skill

A living HTML file that grows with every session. Every developer or AI agent working on
the project appends to the same file — it never gets replaced, only extended.

## The one rule above all others

**Never skip this. Never say "I'll do it next time."**
If code was written, a file was changed, a DB column was added, a config was touched,
a decision was made — it goes in the knowledge book. Every session. No exceptions.
This is the non-technical PM's only reliable window into what is being built.

---

## Step 1 — Find or create the knowledge book

```bash
# Check if it exists in the project root
ls KNOWLEDGE.html 2>/dev/null && echo "EXISTS" || echo "NEW"
```

- If it **exists**: read it, locate the `<!-- SESSIONS -->` and `<!-- NAV -->` injection
  points, then append. Do NOT rewrite the whole file.
- If it **does not exist**: generate the full shell from the template in
  `assets/shell.html`, then write it as `KNOWLEDGE.html` in the project root.

---

## Step 2 — Gather everything that was touched this session

Before writing a single word of documentation, run these commands to get the facts:

```bash
# All files modified since session start (adjust timeframe as needed)
git diff --name-status HEAD 2>/dev/null || git status --short

# New files added
git ls-files --others --exclude-standard 2>/dev/null

# Recent commits by this session
git log --oneline -10 2>/dev/null

# Supabase migrations added this session
ls supabase/migrations/ 2>/dev/null | tail -5

# Package.json changes (new dependencies)
git diff HEAD package.json 2>/dev/null | grep "^[+-]" | grep -v "^---\|^+++" 2>/dev/null
```

Do not document from memory. Always verify from actual file state.

---

## Step 3 — Classify every touched item

Classify each item before writing:

| Type | What it is | Tag to use |
|------|-----------|------------|
| Screen / UI | A page or component the user sees | `tag-new` or `tag-mod` |
| Hook / logic | Reusable code, utility, helper | `tag-new` or `tag-mod` |
| DB migration | New table, column, index, RLS rule | `tag-db` |
| Edge function | Server-side function | `tag-new` or `tag-mod` |
| Config | env, app.config, .json config files | `tag-cfg` |
| Service | Third-party integration added | `tag-new` |
| Modified | Any existing file changed | `tag-mod` |

---

## Step 4 — Write the session block

Read `references/session-block-template.md` for the exact HTML structure to inject.

Key rules for writing each section:

### Session header (one-liner)
Write a single sentence a non-technical PM can read in 5 seconds and understand
what changed in the app. NOT technical. NOT a list. One sentence.

**Good:** "Built the ability to send push notifications — devices register after signup and the server can now target individual users."
**Bad:** "Implemented OneSignal SDK integration with Supabase player_id persistence via useOneSignal hook."

### Swim lane flow
- 4 fixed lanes: Phone (what user sees), App logic (hooks/code), Database, Server
- Number each step sequentially across ALL lanes (step 3 in DB follows step 2 in logic)
- Every step gets a tag (New / Modified / DB / Config)
- Steps that aren't built yet (future sessions) go in the relevant lane greyed out
- Write step descriptions in plain English — no file names, no jargon in the description

### Detail drill-down
For every item in the touched register, write:
1. **What it does** — plain English, 2–3 sentences max. What does a PM need to know?
2. **Flow through it** — the sequence of events as simple nodes joined by arrows
3. **Key line of code** — one highlighted line with a plain English explanation of what it does
4. **Why this way** — the decision. Why this approach and not another? This is the validation layer for the PM.

### Architecture map update
- Add new nodes in the correct layer (Phone / Database / Server / Services)
- Mark `is-new` for created this session, `is-mod` for modified
- Do NOT remove old nodes — the map is cumulative

### Timeline row
- Append one row to the timeline
- Chips = every major thing touched (short labels, clickable)
- Note = one sentence on what this session achieved and what's still pending

### Files register
- Append every touched file with: path, type tag, session number, one-line description
- Never remove entries — register is append-only

### Decisions log
- Extract every "why" from the session — decisions that aren't obvious
- Format: Question → Answer (see reference template)
- 3–8 decisions per session is normal

---

## Step 5 — Inject into the HTML file

```bash
# Verify injection points exist
grep -n "SESSIONS_INJECT\|NAV_INJECT\|ARCH_INJECT\|TIMELINE_INJECT\|FILES_INJECT\|DECISIONS_INJECT" KNOWLEDGE.html
```

Replace each injection comment with new content + the comment (so it stays injectable
for next session). Pattern:

```
<!-- SESSIONS_INJECT -->
```
becomes:
```
[new session HTML block]
<!-- SESSIONS_INJECT -->
```

Do the same for NAV_INJECT, ARCH_INJECT (update nodes), TIMELINE_INJECT (append row),
FILES_INJECT (append rows), DECISIONS_INJECT (append items).

---

## Step 6 — Validate before finishing

```bash
# Confirm the file is valid and readable
wc -l KNOWLEDGE.html
grep -c "page-s" KNOWLEDGE.html   # should equal number of sessions
grep "SESSIONS_INJECT" KNOWLEDGE.html   # should still be present for next session
```

Tell the user:
- How many sessions are now documented
- What was added this session (summary)
- The file path to open in browser: `KNOWLEDGE.html`

---

## Multi-developer and multi-agent rules

When multiple people or multiple Claude Code instances work on the same project:

1. **Always pull before documenting** — run `git pull` before injecting to avoid
   overwriting another session's additions.
2. **Use session numbers, not dates, as IDs** — `page-s5`, `s5` etc. Check the highest
   existing session number before assigning yours.
3. **Each agent documents only its own session** — do not modify another session's block.
   The swim lane and detail sections are append-only per session.
4. **The architecture map and files register are shared** — update these carefully,
   preserving all existing nodes and entries.
5. **Commit the knowledge book with every session** — treat `KNOWLEDGE.html` like
   code. It should be in version control and committed at the end of every session.

```bash
git add KNOWLEDGE.html
git commit -m "docs: session S[N] knowledge book update — [one-line summary]"
```

---

## Reference files

- `references/session-block-template.md` — full HTML template for one session block
- `references/shell-template.md` — full HTML for a brand-new knowledge book
- `assets/` — colour tokens, tag styles (referenced by both templates)

Read these before writing any HTML. Do not invent structure — follow the templates exactly
so all sessions look consistent regardless of who wrote them.
