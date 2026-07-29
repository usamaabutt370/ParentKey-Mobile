# iOS parent / child app split

ParentKey ships as two iOS apps, matching Android flavors.

| Variant | Bundle ID | App Group | Screen Time extensions |
|---------|-----------|-----------|------------------------|
| parent | `com.parentkey.parent` | `group.com.parentkey.parent` | No |
| child | `com.parentkey.child` | `group.com.parentkey.child` | Yes (ShieldConfiguration, ShieldAction, ActivityMonitorExtension) |

## How it works

- `APP_VARIANT=parent|child` selects identity in `appVariant.config.js` / `app.config.js`
- `scripts/apply-ios-variant.js` rewrites the committed `ios/` folder (EAS runs this via `eas-build-post-install`)
- JS reads the variant from `expo-constants` (`src/lib/appInfo.ts`)

## Local commands

```bash
yarn ios:parent          # apply parent IDs + run
yarn ios:child           # apply child IDs + run
yarn prebuild:ios:child  # regenerate native child project (needed for Screen Time extension targets)
yarn build:ios:parent
yarn build:ios:child
yarn credentials:ios:parent
yarn credentials:ios:child
```

## Apple Developer checklist (manual)

1. Create App IDs: `com.parentkey.parent`, `com.parentkey.child`, plus child extension IDs
2. Create App Group `group.com.parentkey.child` (and parent group if needed)
3. Request Family Controls **distribution** for the child App IDs
4. Create two App Store Connect apps
5. Run `yarn credentials:ios:parent` / `yarn credentials:ios:child`
