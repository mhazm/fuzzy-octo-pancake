<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# Nismara Logistics - Project Context & Rules

## 1. Project Overview

Nismara Logistics is a web platform for a virtual trucking community (VTC). It integrates with Discord (for authentication and roles) and Trucky (for in-game data, `truckyId`, `truckyRank`). The platform includes features such as a Social Gallery, Market, Fuel Market, Cargo Market, Convoy management, and a Driver directory.

## 2. Technology Stack

- **Language:** TypeScript (Strict typing, interfaces/types defined inline or in models).
- **Framework:** Next.js (App Router, Server Components & Server Actions).
- **Styling:** Tailwind CSS (Vanilla CSS/Tailwind without complex UI component libraries, relies on custom implementation).
- **Icons:** `lucide-react`.
- **Database (MongoDB):** MongoDB (using native `mongodb` driver). **CRITICAL:** Always use Mongo connection pooling via `clientPromise` from `@/lib/mongodb` rather than opening new connections.
- **Cache / High-Performance Store (Redis):** Uses `ioredis` (exported from `@/lib/redis`). Use Redis for high-frequency, temporary, or time-sensitive tasks (like the "Scratchers" mechanic) where MongoDB would be too slow or expensive.
- **Storage:** Cloudflare R2 (S3-compatible API for all media uploads, combined with WebP compression).
- **Authentication:** NextAuth (Discord Provider).
- **Deployment:** PM2 / Custom Node Server (via `ecosystem.config.js`).

## 3. Core Domains & Conventions

- **User Identification:** The primary identifier is usually `discordId`. Ensure database queries use `discordId` when dealing with user relations. **HOWEVER**, be extremely careful with specific collections! For example, `gallery_posts` and `gallery_comments` use `userId` (which stores the discordId), NOT `discordId`. Always verify the schema (e.g. by checking existing insertion logic) before assuming the field name is `discordId`.
- **Trucky Integration:** Users have a `truckyId` and `truckyRank`. Ensure these are passed down when rendering user profiles or comments.
- **Nismara Plus:** A premium subscription tier represented by `nismaraplus.status === true`. It provides perks like larger upload limits (5MB vs 3MB default), market discounts, GIF upload support, and a special UI badge.
- **Roles & Permissions:** Users can have `discordRole` or `role` set to `"manager"` or `"admin"`. Always check for these roles when showing destructive actions (like deleting posts).

## 4. File Upload & Storage (Cloudflare R2) Rules

- **Deferred Uploads (Client-Side):** DO NOT upload images directly to R2 on an `onChange` event in a form. Instead, store the `File` object in state (e.g., `useState<File | null>`) and show a local preview using `URL.createObjectURL()`. Only perform the actual compression and upload to R2 inside the `handleSubmit` or form `action` block when the user explicitly clicks "Save" or "Submit". This prevents ghost files if the user cancels or changes the image multiple times.
- **Image Compression & WebP Conversion:** ALL image uploads must use the existing utility at `@/lib/imageUtils` (specifically the `compressImageToWebP` function) to compress and convert files to WebP.
- **Upload Limits & Formats:**
  - **Standard Drivers:** Maximum 3MB per file. Allowed formats: PNG, JPEG, JPG. (All must be converted to WebP).
  - **Nismara+ Drivers:** Maximum 5MB per file. Allowed formats: PNG, JPEG, JPG, and **GIF**. (GIFs must **NOT** be converted to WebP; keep original).
- **Storage Hygiene:** When a user updates or replaces an existing image (e.g., changing a profile picture or gallery image), the old file **MUST** be deleted from R2 to prevent orphaned and unused files taking up space.

## 5. Economy, Currency & Penalty System

- **Currency (`currencies` collection):** Nismara Coin (NC) balances are stored here. **CRITICAL:** Every query and update **MUST** include both `userId` (discordId) and `guildId` (usually `process.env.GUILD_ID` or `"863959415702028318"`). To modify a balance, use `$inc: { totalNC: amount }`.
- **Currency History (`currencyhistories` collection):** Every time you modify `totalNC`, you **MUST** insert a log into this collection. The document must contain:
  - `userId`: The user's discordId.
  - `guildId`: The server's ID.
  - `amount`: The amount of NC added or deducted.
  - `type`: Either `"earn"` or `"spend"`.
  - `reason`: A string describing the transaction (e.g. `"Membeli Mod Market: Scania"`).
  - `createdAt`: `new Date()`.
- **Penalty Points (`points` collection):** "Points" in this project strictly means **Penalty Points (Hukuman)**, not reward points. Balances are stored in `totalPoints`. Like currencies, queries **MUST** include `userId` and `guildId`. Use `$inc: { totalPoints: amount }` to modify. **CRITICAL:** Penalty points can NEVER be negative (minimum 0). Always check current balance and clamp deductions if necessary.
- **Penalty History (`pointhistories` collection):** Every time penalty points are modified, a log must be inserted containing:
  - `userId` (discordId of the penalized user) and `guildId`.
  - `managerId`: the discordId of the admin/manager applying or removing the penalty (or the user themselves if paying off a penalty).
  - `points`: The amount of points added or removed.
  - `type`: Either `"add"` (giving penalty) or `"remove"` (paying/removing penalty).
  - `reason`: String explanation.
  - `createdAt`: `new Date()`.

## 6. UI/UX & Styling Guidelines

- **Badges:** All user role, premium, and rank badges MUST be rendered using the centralized `<UserBadges />` component located at `components/icons/UserBadges.tsx`. Do not hardcode individual icons (like crowns or checkmarks) across different pages.
- **Gallery & Comments:** The gallery uses a "Threaded / Instagram Style" for comments. Comments support nested replies (1-level deep via `parentId` and `replyToUser`) and optimistic UI updates for "Likes".
- **Modern & Dynamic:** Follow the "Web Application Development" rules: use modern typography, vibrant/dark mode colors, smooth gradients, and micro-animations (e.g., hover effects, scale transforms).
- **Z-Index & Tooltips:** Use Tailwind's `group` and `group-hover` strategically to avoid stacking context issues when rendering lists of items with tooltips/badges.
- **Destructive/Critical Actions & Alerts:** NEVER use the native browser `alert()` or `confirm()` dialogs. Instead, ALWAYS import and use `showAlert` and `showConfirm` from `@/lib/dialog`. These functions return Promises and trigger our custom global `<Modal />` component. Example usage: `await showAlert("Berhasil!")` or `if (await showConfirm("Yakin hapus?")) { ... }`. This prevents ugly browser pop-ups and avoids polluting components with manual modal state.

## 7. Data Formatting Standards
- **Timezone (WIB/Jakarta):** Always format dates and times explicitly to `Asia/Jakarta` using `toLocaleString("id-ID", { timeZone: 'Asia/Jakarta', ... })` and append " WIB" where contextually appropriate, especially on charts, feeds, and market history.
- **Currency (NC):** Always format Nismara Coin (NC) balances to standard Indonesian currency format (e.g. `2.000,00 NC`) using `.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })`. Do NOT use `.toFixed(2)` for frontend display of user balances.
- **Fuel (Liter):** Fuel amounts should always be displayed as flat integers without decimals (e.g. `500 L`). Use `Math.floor()` before formatting with `.toLocaleString("id-ID")`.

## 8. Domain Configuration

- **Production URL:** `https://transport.nismara.web.id`.
- **Beta URL/Preview:** `https://beta.nismara.web.id`.

## 8. Documentation & Walkthroughs

- **Convention:** Whenever creating new major features or system mechanics, agents should reference or update the documentation in this folder (e.g., `sistem-mekanik.md`, `sistem-notifikasi.md`). This acts as the project's historical log and knowledge base.

## 9. Next.js 15+ / 16 & CSS Layout Gotchas

- **searchParams (Next.js 15+):** In Server Components, `searchParams` is a Promise and **MUST** be unwrapped (e.g. `const resolvedParams = await searchParams;`) before accessing its properties (like `resolvedParams.tag`).
- **Sticky Positioning & Overflow:** NEVER use `overflow-x-hidden` on `<html>`, `<body>`, or outer layout wrappers if you intend to use `position: sticky` on descendant elements. It establishes a new block formatting context that completely breaks sticky positioning relative to the viewport. Use `overflow-x-clip` instead, which clips horizontal overflow without breaking sticky behavior.
- **Client State Re-hydration:** When a Server Component passes new props to a Client Component due to URL navigation (like changing `searchParams`), standard `useState(initialProp)` will NOT automatically update. Always use a `useEffect` to sync the state when the props change to ensure the UI reflects the new data without requiring a full manual reload.

## 10. Recent Architectural Patterns & Conventions

- **Fleet Assignment & Ownership:** When dealing with Fleet Assignments, ALWAYS use the `owner` field rather than `driver` to determine ownership. The `driver` field is maintained on the backend for legacy sync but should not be relied upon in frontend state. When rendering dropdowns to assign users (e.g. in Modals or Buy pages), NEVER use a native `<select>` due to the large number of users. Instead, use a custom searchable dropdown that allows filtering by `name`, `discordId`, and `truckyId`.
- **Ticket Auto-fill via URL:** The Ticket System (`TicketClient.tsx`) supports automatic form filling via URL parameters. When linking users to report a feature (e.g. reporting a comment), pass rich context in the URL (e.g. `?commentId=...&postId=...&reportedUser=...&commentText=...`). The TicketClient will automatically detect these, select the appropriate Category (like "Report Komentar"), and construct a detailed description payload to help Managers quickly identify the issue without manual investigation.
- **Modal vs Detail Page Consistency:** When building features that exist both on a standalone page (e.g., `PostDetailClient`) and a quick-view modal (e.g., `GalleryModal`), ensure complete feature parity. Actions like Edit, Delete, and Report must be fully synchronized and functional in both contexts with Optimistic UI updates.
- **Hybrid Session Caching:** The NextAuth `session` callback utilizes a hybrid caching strategy using Redis. Do not perform heavy MongoDB queries or external API calls (Discord, Trucky) directly inside the `session` callback on every request. Always check for a cached profile in Redis (`session:profile:${user.id}`) first. If a cache miss occurs, perform the queries and save the result to Redis with a 15-minute TTL (`900` seconds) before returning the session.
- **Session Garbage Collection:** The MongoDB `sessions` collection must have a TTL index on the `expires` field (`{ "expires": 1 }, { expireAfterSeconds: 0 }`) to automatically delete expired sessions and prevent database bloat. Do not rely on application-level cron jobs to clean up expired NextAuth sessions.
