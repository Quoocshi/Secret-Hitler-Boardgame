# Development Environment & Prerequisites

This document outlines the required runtime versions, package specifications, and quickstart commands to run both the **Backend** and **Frontend** services locally.

---

## System Requirements & Runtimes

Ensure your machine has the following tools installed and matching the versions below:

| Tool | Version | Notes |
| :--- | :--- | :--- |
| **Java** | `21.0.11 LTS` (Java 21+) | Oracle JDK / OpenJDK 21 64-Bit Server VM |
| **Node.js** | `v24.15.0` (LTS/Current) | Required for the frontend development server |
| **npm** | `11.12.1` | Node package manager |
| **Maven** | `3.9.x`+ (or use `./mvnw`) | Build tool for the Spring Boot backend |

Verify your local installation:
```bash
java --version
node -v
npm -v