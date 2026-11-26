# Produla — Swift website

This is the Swift/Vapor server-rendered version of Produla. The HTTP server, routing, and HTML document are written in Swift. The browser uses a small JavaScript layer for live search and Supabase-backed discovery because browsers do not execute server-side Swift directly.

## Run locally

Requires Swift 6.0+.

```sh
cd swift
swift run
```

Open http://localhost:8080.

## Deploy

This app is a long-running Vapor server, not a static GitHub Pages site. Deploy the `swift/` directory with its Dockerfile to a container host (for example Fly.io or another Swift/Docker host). Set the service port to 8080.

## Current migration status

- Swift Vapor server and Swift-generated HTML shell
- Responsive Liquid Glass-inspired interface
- Live public artist profiles, song requests, and releases from the existing Supabase project
- Existing React site remains untouched at the repository root

Authentication, uploads, messaging, profile editing, studio tools, and complete release management still need to be ported before this replaces the current production site.
