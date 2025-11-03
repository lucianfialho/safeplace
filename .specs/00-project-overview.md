# Project Overview: SafePlace

## Vision
SafePlace is a web application that provides real-time safety scoring for rental properties in Brazil by aggregating and analyzing incident data from OTT (Onde Tem Tiroteio). Users can input any Quinto Andar property URL and instantly receive comprehensive safety metrics, historical incident data, and comparative analysis.

## Core Value Proposition
Transform public safety data into actionable insights for apartment hunters, helping them make informed decisions about where to live based on real-time and historical security metrics.

## Target Users
1. **Primary**: Individuals searching for rental properties in Rio de Janeiro and São Paulo
2. **Secondary**: Real estate investors, property managers, researchers, journalists

## Key Features

### 1. URL Wrapper Service
- Accept Quinto Andar property URLs
- Extract property details (ID, location, price, specs)
- Display original listing data alongside safety metrics

### 2. Safety Score Engine
- Calculate 0-100 safety score based on incident data
- Multi-radius analysis (500m, 1km, 2km)
- Temporal analysis (30/90/365 days)
- Incident type weighting (shootings > shots heard > fires)
- Trend detection (improving/worsening)

### 3. Data Visualization
- Interactive map with incident pins
- Heatmap of surrounding area
- Timeline charts
- Comparative graphs (vs neighborhood/city average)

### 4. Historical Data Repository
- Store all OTT incidents with timestamps
- Enable historical queries and analysis
- Support comparative studies

## Technical Stack

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Maps**: Mapbox GL JS or Leaflet
- **Charts**: Recharts or Chart.js

### Backend
- **Framework**: Next.js 15 API Routes
- **Language**: TypeScript
- **Runtime**: Node.js 20+

### Database
- **Primary**: PostgreSQL 16+
- **Extensions**: PostGIS (geospatial queries)
- **ORM**: Prisma or Drizzle ORM

### Data Collection
- **Scraper**: Playwright or Puppeteer
- **Scheduler**: Built-in Next.js cron (via Vercel Cron or node-cron)
- **Frequency**: Every 1 minute for real-time data

### Infrastructure
- **Hosting**: Vercel (recommended) or self-hosted
- **Database**: Neon, Supabase, or Railway PostgreSQL
- **Monitoring**: Vercel Analytics + Sentry (optional)

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Landing Page │  │ Analysis Page│  │  Map View    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                    Next.js API Routes                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   /analyze   │  │  /incidents  │  │   /score     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                     Service Layer                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │QA Extractor  │  │ Score Engine │  │  Geo Service │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                    PostgreSQL + PostGIS                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  incidents   │  │  properties  │  │  analytics   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      Background Jobs                        │
│  ┌──────────────────────────────────────────────────┐      │
│  │  OTT Scraper (runs every 1 minute)              │      │
│  └──────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

### User Analysis Flow
1. User inputs Quinto Andar URL
2. Frontend sends URL to `/api/analyze`
3. Backend extracts listing ID and scrapes property data
4. System retrieves lat/long coordinates
5. Score engine queries incidents within configured radii
6. System calculates safety score and statistics
7. Frontend displays results with visualizations

### Background Scraping Flow
1. Cron job triggers every 1 minute
2. Scraper fetches OTT reportview.php page
3. Parser extracts incident records
4. System deduplicates against existing records
5. New incidents inserted into PostgreSQL
6. PostGIS indexes updated for geospatial queries

## Success Metrics

### Technical Metrics
- Data freshness: < 2 minutes lag from OTT
- API response time: < 500ms for score calculation
- Scraper success rate: > 99%
- Database query performance: < 100ms for geo queries

### User Metrics
- Property analysis completion rate
- Average time on analysis page
- Return user rate
- Social shares of results

## MVP Scope (Phase 1)

### In Scope
- URL input and property extraction
- Basic safety score (0-100)
- Single radius analysis (1km)
- 30-day historical data
- Simple map visualization
- OTT scraper running every 1 minute
- Rio de Janeiro coverage only

### Out of Scope (Future Phases)
- User accounts and saved properties
- Email alerts for score changes
- Browser extension
- Mobile app
- Multiple cities beyond RJ
- Predictive analytics
- API for third-party integration
- White-label solutions

## Development Phases

### Phase 1: Foundation (Weeks 1-2)
- Database schema and setup
- OTT scraper implementation
- Basic data collection (7 days of history)

### Phase 2: Core Features (Weeks 3-4)
- Quinto Andar URL extractor
- Safety score engine
- API routes

### Phase 3: Frontend (Weeks 5-6)
- Landing page
- Analysis page with visualizations
- Map integration

### Phase 4: Polish & Launch (Week 7-8)
- Performance optimization
- Error handling and edge cases
- Documentation
- Soft launch and feedback

## Risk Mitigation

### Technical Risks
- **OTT structure changes**: Implement robust error handling and alerts
- **Rate limiting**: Implement exponential backoff and respect robots.txt
- **Data accuracy**: Cross-reference with multiple sources when available
- **Scalability**: Use database indexes and caching strategies

### Legal/Ethical Risks
- **Data scraping legality**: Review OTT terms of service, consider reaching out for partnership
- **Privacy concerns**: Never collect or display personal information
- **Neighborhood stigmatization**: Include disclaimers and context
- **Liability**: Clear terms of service stating data is for informational purposes only

## Next Steps

1. Review and approve specifications
2. Set up development environment
3. Initialize Next.js 15 project
4. Configure PostgreSQL with PostGIS
5. Begin Phase 1 development
