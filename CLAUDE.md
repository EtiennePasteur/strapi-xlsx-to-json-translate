# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Strapi v5 plugin that converts XLSX translation files into nested JSON files. It reads Excel files with a specific format (Informations, Key, and language columns) and generates separate JSON files for each language in `/public/i18n/[filename]/`.

## Development Commands

```bash
# Build the plugin for production
npm run build

# Watch mode for development (auto-rebuild on changes)
npm run watch

# Watch and link for development in a Strapi project
npm run watch:link

# Verify plugin compatibility with Strapi
npm run verify

# TypeScript type checking
npm run test:ts:front  # Check admin panel types
npm run test:ts:back   # Check server types
```

## Architecture

### Plugin Structure

This is a Strapi plugin with two main parts:

1. **Admin Panel** (`admin/src/`): React-based UI for uploading XLSX files
2. **Server** (`server/src/`): Backend logic for processing files

### Key Files and Flow

**File Upload Flow:**
1. User uploads XLSX via `admin/src/pages/HomePage.tsx`
2. File sent to `/strapi-xlsx-to-json-translate/upload` endpoint (defined in `server/src/routes/admin.ts`)
3. `server/src/controllers/controller.ts` validates upload and calls service
4. `server/src/services/service.ts` processes the file:
   - Reads XLSX using the bundled `xlsx` library
   - Extracts translations from first sheet
   - Groups by language and nests keys using dot notation (e.g., `app.title` → `{ app: { title: "..." } }`)
   - Writes JSON files to `/public/i18n/[filename]/[lang].json`

**Multiple Translation Projects:**
The plugin supports multiple translation sets by using the uploaded filename (without extension) as the directory name. For example:
- Upload `project-a.xlsx` → files saved to `/public/i18n/project-a/`
- Upload `project-b.xlsx` → files saved to `/public/i18n/project-b/`

### Critical Implementation Details

**XLSX Library:**
- Uses a bundled local version: `vendor/xlsx-0.20.3.tgz`
- Specified in `package.json` as `"xlsx": "file:vendor/xlsx-0.20.3.tgz"`
- Listed in `bundledDependencies` to ensure it's included in npm package
- DO NOT change to use the npm registry version without verification

**Expected Excel Format:**
```
| Informations | Key              | en       | fr       |
|--------------|------------------|----------|----------|
| Description  | app.title        | My App   | Mon App  |
| Description  | app.welcome.text | Welcome  | Bienvenue|
```
- First column: "Informations" (optional, used for context/description)
- Second column: "Key" (required, supports dot notation for nesting)
- Remaining columns: Language codes (column name becomes the JSON filename)

**Key Transformation:**
The `unflatten()` function in `server/src/services/service.ts` converts dot-notation keys into nested objects:
```javascript
// Input: { "app.title": "Hello" }
// Output: { app: { title: "Hello" } }
```

**Authentication:**
- Plugin uses Strapi's cookie-based authentication (Strapi v5+)
- Previous versions used manual auth headers with tokens in sessionStorage
- Auth is automatically handled by Strapi's `getFetchClient()` in the admin panel

**File Validation:**
- Frontend validates file type (.xlsx/.xls), size (10MB max), and non-empty
- Backend validates MIME type, size, sheet existence, and data presence
- Both use consistent MAX_FILE_SIZE of 10MB

## TypeScript Configuration

- Admin panel: Extends `@strapi/typescript-utils/tsconfigs/admin`
- Server: Extends `@strapi/typescript-utils/tsconfigs/server`
- Both have `rootDir: "../"` to allow imports across the plugin structure

## Common Issues

**When modifying the XLSX processing logic:**
- Always test with files containing special characters in keys (dots, dashes, etc.)
- Validate that empty cells are handled correctly
- Check that the unflatten logic preserves deeply nested structures

**When updating Strapi dependencies:**
- This plugin is built for Strapi v5 (`^5.22.0`)
- Major Strapi version changes may affect authentication, plugin APIs, or Design System components
- Always run `npm run verify` after dependency updates

**When debugging file upload issues:**
- Check browser console for client-side errors
- Check Strapi server logs for backend errors (service errors are logged via `console.error`)
- Verify file permissions on the `/public/i18n/` directory
- Ensure the public directory path is correctly resolved via `strapi.config.get('server.dirs.public')`
