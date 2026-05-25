# ModStat

ModStat is a Dev Platform app that helps Reddit moderators track removed posts and comments, identify the most enforced rules, detect repeat offenders, and generate automatic weekly moderation reports.

Once installed, ModStat automatically listens for moderator and AutoMod removal actions in your subreddit and stores analytics like removal reasons, moderator activity, daily trends, repeat offenders, and AutoMod performance - all inside a clean moderation dashboard.

---

# Features

- Most cited rule tracking
- Repeat offender detection
- Moderator activity analytics
- Daily removal trends
- Recent moderation feed
- Moderator-only dashboard
- Automatic Weekly Reports
- AutoMod removal tracking
- False positive detection
- AutoMod tuning insights

---

# AutoMod Analytics

ModStat can also track AutoMod removals by using `action_reason` inside your AutoMod configuration.

This allows ModStat to:

- Track which AutoMod rules remove the most content
- Detect false positives
- Identify AutoMod removals later approved by human moderators
- Show which AutoMod rules may need tuning

Example AutoMod configuration:

```yaml
type: comment
author:
  comment_karma: '< 5'
action: remove
action_reason: Low Karma Filter
```

Once added, ModStat will automatically include AutoMod removals in analytics and reports.

---

# Zero Set-Up

Every Monday, ModStat automatically sends a private weekly moderation report to Modmail.

---

# Reports Include

- Total removals
- Top rule violations
- Moderator activity
- Repeat offenders
- AutoMod removal statistics
- False positive rates
- Weekly moderation trends
- AutoMod rules that may require tuning

---

# How It Works

1. Install ModStat on your subreddit
2. Add `action_reason` to your AutoMod rules (optional but recommended)
3. ModStat automatically listens for moderator and AutoMod removal events
4. Analytics are processed and displayed in the dashboard
5. Weekly reports are automatically delivered to Modmail

---

# Why False Positive Tracking Matters

AutoMod rules can sometimes remove legitimate content.

ModStat tracks:

- AutoMod removals later approved by moderators
- Which rules create the most false positives
- Patterns that suggest overly aggressive filtering

This helps moderators tune AutoMod more effectively and reduce unnecessary removals.

---

# Privacy

ModStat only processes moderation events required for analytics and reporting.

No additional subreddit configuration or manual data setup is required.

---

# Install Once

Install ModStat once and it automatically handles moderation analytics and reporting for your subreddit.
