## What and why

<!-- One or two sentences. Use generic examples: this repository is public. -->

## Checklist

- [ ] `npm run check && npm run lint && npm test` pass.
- [ ] Each changed package has an entry under `## Unreleased (patch|minor|major)` in its `CHANGELOG.md`, with the
      bump raised if this change needs more. Breaking changes start with `**Breaking:**` and say what sites change
      (and are major); deprecations start with `**Deprecated:**`.

For a new or changed component ([CONTRIBUTING.md](../CONTRIBUTING.md#checklist-for-a-new-or-changed-component)):

- [ ] Follows the [API conventions](../docs/design-guide.md#conventions-for-component-apis).
- [ ] Only tokens in its CSS.
- [ ] `FieldProps` for form controls; other attributes passed on; `class` accepted.
- [ ] States visible in forced colors; motion uses the duration tokens.
- [ ] Its states are on the sandbox's States page (and the visual baselines updated if it's meant to look
      different).
- [ ] A test, a README entry, and a line in the design guide.
