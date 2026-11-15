# WalkingSG

**WalkingSG** is a pedestrian-first mobile navigation app for Singapore. It generates **5 walking route options** per trip (*Direct, Maximum Shelter, Barrier-Free, Low-Effort, Wide & Quiet*) and ranks them using the user's mobility profile, live **NEA weather forecasts**, and **community-reported path hazards**.

🎥 **[Watch the WalkingSG Demo Video](<Lab 5/WalkingSG_Demo_Video.mp4>)**

---

## Features

- **Personalized Routing** — Scores and ranks 5 route types based on wheelchair/mobility-aid needs, stair limits, and UV/heat sensitivity.
- **Weather-Adaptive Scoring** — Pulls live Singapore NEA `data.gov.sg` weather (with an in-app demo weather switcher) to prioritize sheltered walkways during rain or heat.
- **Live Navigation & Hazard Rerouting** — Turn-by-turn GPS tracking with one-tap rerouting around blocked paths, flooding, or broken lifts (`55m` avoidance zones via OpenRouteService).
- **Community Hazard Feed** — Report and view nearby path hazards within `5 km`, plus post-walk ratings that update segment confidence scores.
- **Singapore Map & Search** — SLA OneMap address autocomplete and Singapore boundary validation.

---

## System Diagrams

### System Architecture
![System Architecture](<Lab 3/walkingsg_system_architecture.jpeg>)

### UI Navigation Dialog Map
![Dialog Map](<Lab 5/DialogMap-Final.jpeg>)

### Use Case Diagram
![Use Case Diagram](<Lab 5/UseCaseDiagram-Final.jpeg>)

### System Class Diagram
![System Class Diagram](<Lab 5/ClassDiagram_Final_ver2.drawio.jpeg>)

### Route Generation Class Diagram
![Route Generation Class Diagram](<Lab 5/ClassDiagram_RouteGeneration.jpeg>)

### Live Navigation & Rerouting Class Diagram
![Rerouting Class Diagram](<Lab 5/ClassDiagram_Rerouting.jpeg>)

### App UI Screens

#### Onboarding & Authentication
| Onboarding | Login |
| :---: | :---: |
| <img src="Lab 5/UI/Init.jpg" width="220" alt="Init" /> | <img src="Lab 5/UI/Login-1.jpg" width="220" alt="Login 1" /> |
| **Sign Up** | **OTP / Reset** |
| <img src="Lab 5/UI/Login-2.jpg" width="220" alt="Login 2" /> | <img src="Lab 5/UI/Login-3.jpg" width="220" alt="Login 3" /> |

#### Profile & Mobility Preferences
| Profile Overview | Personal Declaration | Mobility Mode |
| :---: | :---: | :---: |
| <img src="Lab 5/UI/Profile-1.jpg" width="220" alt="Profile 1" /> | <img src="Lab 5/UI/Profile-2.jpg" width="220" alt="Profile 2" /> | <img src="Lab 5/UI/Profile-3.jpg" width="220" alt="Profile 3" /> |

#### Map Search & Route Generation
| GPS & Map Search | Out-of-Bounds Check |
| :---: | :---: |
| <img src="Lab 5/UI/GPS-1.jpg" width="220" alt="GPS" /> | <img src="Lab 5/UI/Restricted.jpg" width="220" alt="Restricted" /> |
| **Route Comparison** | **Expanded Route Details** |
| <img src="Lab 5/UI/RouteGeneration-1.jpg" width="220" alt="Route Generation 1" /> | <img src="Lab 5/UI/RouteGeneration-2.jpg" width="220" alt="Route Generation 2" /> |

#### Live Navigation & Community Hazard Feed
| Live Navigation | Navigation Progress | Arrival & Rating |
| :---: | :---: | :---: |
| <img src="Lab 5/UI/LiveNavigation-1.jpg" width="220" alt="Live Nav 1" /> | <img src="Lab 5/UI/LiveNavigation-2.jpg" width="220" alt="Live Nav 2" /> | <img src="Lab 5/UI/LiveNavigation-3.jpg" width="220" alt="Live Nav 3" /> |

| Local Hazard Feed | Report an Issue |
| :---: | :---: |
| <img src="Lab 5/UI/Hazard-1.jpg" width="220" alt="Hazard 1" /> | <img src="Lab 5/UI/Hazard-2.jpg" width="220" alt="Hazard 2" /> |

---

## Tech Stack

| Layer | Stack |
| :--- | :--- |
| **Mobile** | React Native (Expo), TypeScript, React Navigation, Leaflet WebView (OneMap) |
| **Backend** | Python 3.11+, FastAPI, Pydantic v2, Uvicorn |
| **Database** | MongoDB + Beanie ODM (`2dsphere` geospatial indexing) |
| **External APIs** | SLA OneMap, OpenRouteService (`ORS`), OSRM, NEA `data.gov.sg` Weather |

---

## Quick Start

### 1. Backend (`walkingsg-backend`)
```powershell
cd walkingsg-backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env      # Fill in DB_URI, JWT_SECRET, ORS_API_KEY
python scripts/seed_map_segments.py
python server.py                 # Runs at http://localhost:3052 (Swagger: /docs)
```

### 2. Mobile (`walkingsg-mobile`)
```powershell
cd walkingsg-mobile
npm install
# Optional: set EXPO_PUBLIC_API_URL=http://<YOUR_WIFI_IP>:3052/v1/api in .env
npx expo start -c
```

---

## Running Tests

```powershell
# Backend unit tests
cd walkingsg-backend
python -m pytest -v

# Mobile unit tests (Jest) & TypeScript check
cd ../walkingsg-mobile
npm test
npx tsc --noEmit
```

---

## Core Documentation (`Lab 5/`)

- **Software Requirements Specification (SRS):** [WalkingSG_SRS.pdf](<Lab 5/WalkingSG_SRS.pdf>)
- **Backend Test Report:** [WalkingSG_Backend_Test_Report.pdf](<Lab 5/WalkingSG_Backend_Test_Report.pdf>)
- **Frontend Test Report:** [WalkingSG_Frontend_Test_Report.pdf](<Lab 5/WalkingSG_Frontend_Test_Report.pdf>)
- **Demo Video:** [WalkingSG_Demo_Video.mp4](<Lab 5/WalkingSG_Demo_Video.mp4>)
- **Diagrams:** [DialogMap-Final.jpeg](<Lab 5/DialogMap-Final.jpeg>) · [UseCaseDiagram-Final.jpeg](<Lab 5/UseCaseDiagram-Final.jpeg>) · [ClassDiagram_Final_ver2.drawio.jpeg](<Lab 5/ClassDiagram_Final_ver2.drawio.jpeg>) · [ClassDiagram_RouteGeneration.jpeg](<Lab 5/ClassDiagram_RouteGeneration.jpeg>) · [ClassDiagram_Rerouting.jpeg](<Lab 5/ClassDiagram_Rerouting.jpeg>)
- **UI Screens:** [`Lab 5/UI/`](<Lab 5/UI>)

---

## Project Structure

- [`walkingsg-backend/`](./walkingsg-backend) — FastAPI REST server, routing strategies, external API adapters, and `pytest` suite
- [`walkingsg-mobile/`](./walkingsg-mobile) — React Native (Expo) app and Jest test suite
- [`Lab 5/`](<Lab 5>) — Final SRS, test reports, demo video, system diagrams, and UI screens (earlier iterations in [`Lab 1/`](<Lab 1>) – [`Lab 4/`](<Lab 4>))
