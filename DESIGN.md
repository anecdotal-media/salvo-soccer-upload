---
name: Salvo Soccer Media
colors:
  navy: "#173e59"
  orange: "#b94a13"
  surface: "#ffffff"
  canvas: "#f1f4f5"
  ink: "#16364c"
typography:
  body:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  control: "6px"
  panel: "12px"
---

## Overview
Extend the official Salvo Soccer website into a focused upload tool. Preserve the crest, navy and orange. Operate mode: immediate file selection, clear destination and visible progress.

## Colors
Navy owns the header and primary actions. Burnt orange supplies the active tab and action accent with accessible contrast. White workspace on a cool pale canvas.

## Typography
System sans for forms and content; bold compact headings. Fixed rem sizes, no decorative type in controls.

## Layout
Desktop two-column workspace: large upload area and narrow destination summary. Below 800px stack destination before uploader. Recent files form a responsive grid.

## Elevation & Depth
Use borders for separation, no card shadows.

## Shapes
Six-pixel controls, twelve-pixel panels, restrained badges.

## Components
Native selects and inputs. Uppy Dashboard supplies selection, thumbnails, progress, retry and cancellation. Visible keyboard focus. Inline status messages for connection and failure.

## Do's and Don'ts
Use real club assets. Keep credentials out of client code. Do not invent member submissions or upload counts.

## Library extension
The homepage is a management workspace: navy header, pale sidebar, broad search, compact filter row and a contact sheet of real assets. Default to all assets across folders, newest first. Use grid/list alternatives; inspect assets in a native dialog with preview and metadata. Preserve normal tab order, visible focus, semantic forms and mobile access to saved views. AI-generated labels use a muted green treatment and remain distinct from human tags. Plan restrictions are explained alongside AI tools. Source layouts live in web/ and are embedded into the deployment by scripts/compile.mjs.
