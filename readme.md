# Load/stress test with K6 POC

This repository was developed to practice non functional testing, specifically load and stress testing using k6.

## How to run the API and the tests

- **API**:
  - You need `docker` and `docker-compose`.
  - Build and run: `docker-compose up --build -d`
  - Watch logs: `docker-compose logs`
  - List containers: `docker ps`
  - List container system stats: `docker stats container_id`
- **K6 tests**:
  - You need `K6`
  - Run: `K6_WEB_DASHBOARD=true K6_WEB_DASHBOARD_OPEN=true K6_WEB_DASHBOARD_EXPORT=html-report.html k6 run --http-debug api_k6_test.js --out json=k6-logs.json`

## [K6 Docs](https://grafana.com/docs/grafana-cloud/testing/k6/)

## [Non functional testing](./non-functional-testing.md)
