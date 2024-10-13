## Overview

- In this article, you'll understand the crucial role of non-functional testing for your software's overall performance and reliability. We'll particularly focus on load and stress testing, highlighting why these tests are essential in ensuring your application can handle real-world traffic conditions and beyond. By the end, you'll appreciate the importance of stress testing in identifying breaking points and ensuring robustness under peak loads.

## Table of Contents

- [What is Non-Functional Testing](#what-is-non-functional-testing)
- [Some Types of Non-Functional Testing](#some-types-of-non-functional-testing)
  - [Performance Testing](#performance-testing)
    - [Load Testing](#load-testing)
    - [Stress Testing](#stress-testing)
  - [Reliability Testing](#reliability-testing)
  - [Security Testing](#security-testing)
- [Which Metrics to Monitor on Your Server](#which-metrics-to-monitor-on-your-server)
- [What is k6](#what-is-k6)
- [Getting Started with k6](#getting-started-with-k6)
  - [The Project We Will Test](#the-project-we-will-test)
  - [API Code](#api-code)
  - [K6 Tests Using Javascript](#k6-tests-using-javascript)
  - [Running Your k6 Test](#running-your-k6-test)
  - [System Metrics Before and During Load Test](#system-metrics-before-and-during-load-test)
  - [K6 Native Dashboard Results](#k6-native-dashboard-results)
  - [How to Analyze the K6 Dashboard Metrics](#how-to-analyze-the-k6-dashboard-metrics)
  - [Understanding the Metrics](#understanding-the-metrics)
- [Where can I send my K6 Metrics and Logs](#where-can-i-send-my-k6-metrics-and-logs)
- [How to Use k6 Tests in Production](#how-to-use-k6-tests-in-production)
- [References](#references)

## What is Non Functional Testing

First, we need to understand what functional and non-functional requirements are. It's important to recognize that both are relevant to an application.

- **Functional requirements**: Define things the system must do, features, and behaviors that fulfill business needs.
  - Send an email after user registration.
  - Show financial dashboards with charts in real time.
- **Non-functional requirements**: Define the quality of the system: **performance, security, reliability, scalability, etc...**
  - The webpage should be loaded in 1.8 seconds or less for any user. [FCP](https://web.dev/articles/fcp) <= 1.8s (performance)
  - The API financial data updates should be able to return for 1 million users simultaneously in less than 3 seconds. (scalability and performance)

As you can imagine, if the **non-functional requirements** are not met, users may become frustrated and eventually stop using the application. This is just one example: _"[Slow pages can increase bounces](https://www.thinkwithgoogle.com/marketing-strategies/app-and-mobile/mobile-page-speed-load-time/)"._

## Some Types of Non Functional Testing

### Performance Testing
  - Evaluate how well the system performs under various conditions, measuring response times of web pages under different user loads.

### Load Testing
  - Tests the system's behavior under **expected load** conditions.
  - Example: Simulate 10,000 concurrent users accessing an e-commerce website.

    #### Stress Testing
    - Pushes the system **beyond its normal operational limits** to evaluate its stability.
    - Example: Increase database transactions exponentially to test system crash points.

### Reliability Testing
  - Ensures the system functions correctly and reliably under different conditions.
  - Example: Verify that the system recovers gracefully from server failures.

### Security Testing
  - Identifies vulnerabilities and ensures data protection within the system.
  - Example: Conduct penetration tests to uncover weaknesses in authentication.

## Which metrics to monitor on your server

- **System Metrics:**
  - **CPU Usage**: Identify if the server is under heavy load, which can lead to performance degradation or bottlenecks in processing tasks.
  - **Memory Usage**: Identify memory leaks or insufficient memory allocation, which can cause slowdowns or crashes when memory is exhausted.
  - **Disk Usage**: Identify when storage is nearing capacity, which can lead to application failures or data loss if not managed properly.
- **Application Metrics:**
  - **Request Rate**: Monitor requests per minute (RPM) and requests per second (RPS).
  - **Response Time**: Evaluate the time it takes for your API to respond to requests. This helps identify performance issues.
- **Error Metrics:**
  - **Error counts**: 4xx, 5xx
    - Many **4xx errors** may indicate poorly written documentation for your API consumers.
    - An increase in **5xx errors** suggests server-side issues that must be addressed.
- **Security Metrics:**
  - Failed **Login Attempts**: Monitor the number of 401 HTTP status codes. This can indicate potential brute force attacks or unauthorized access attempts.
- **Database Metrics:**
  - **Query Performance**: Identify queries that fetch more data than necessary, particularly those with excessive joins (SQL) or aggregates (NoSQL).
  - **Active connections**: You can identify errors in your logic to connect to your database and also verify if you are closing the connections correctly.
- **Uptime/Downtime:** Monitor the availability of your server.
  - Tracking **Uptime** helps ensure that your services are running smoothly.
  - Tracking **Downtime** monitoring helps identify and address outages promptly.
- **Cache Hit Ratio**: It’s important to understand whether your data is being served from the cache. If your cache hit ratio is low,
  it indicates that the cache is not being effectively utilized, and you may need to reconsider your caching strategy.

These are just some important metrics that you should monitor on your server; there are more.

## What is [K6](https://grafana.com/docs/k6/latest/)
- K6 is an open-source load testing tool for the performance and reliability evaluation of web applications and APIs.

## Getting Started with k6:

### The Project We Will Test
  - It is a simple, basic NodeJS REST API with docker and docker-compose to manage the container.
  - A basic Node.js REST API designed to run in a containerized environment using Docker and Docker Compose.
  - In this implementation, all data is stored in memory for simplicity, while the resource limits for the application are specified in the docker-compose.yml file.
  - With CPU usage limited to 20% and memory capped at 64MB, **limiting resources** for load/stress testing **locally** is a good idea if you want to evaluate how the application behaves under constrained conditions, identify performance bottlenecks, and ensure it can handle unexpected spikes in traffic without crashing.
    - `docker-compose.yml`
      ```yml
      version: '3.8'
      services:
        app:
          build: .
          ports:
            - "3000:3000"
          deploy:
            resources:
              limits:
                cpus: '0.2' # Limit CPU usage to 20%
                memory: 64M # Limit memory usage to 64MB
      ```

### [API code](https://github.com/godinhojoao/k6-load-stress-tests-api)
  - The API code is at the repository: https://github.com/godinhojoao/k6-load-stress-tests-api

### K6 Tests Using Javascript
  ```javascript
      import http from 'k6/http';
      import { sleep, group } from 'k6';
      import { Trend, Counter } from 'k6/metrics';

      // Define trends for response duration for each request type
      // https://grafana.com/docs/k6/latest/javascript-api/k6-metrics/trend/
      const reqDurationTimeGet = new Trend('req_duration_time_get', true); // true to use 'milliseconds'
      const reqDurationTimePost = new Trend('req_duration_time_post', true);
      const reqDurationTimeDelete = new Trend('req_duration_time_delete', true);

      // Counter for counting event occurrences, like errors.
      const getCounterErrors = new Counter('get_errors_counter');
      const postCounterErrors = new Counter('post_errors_counter');
      const deleteCounterErrors = new Counter('delete_errors_counter');

      // By adjusting the options and sleep time, you can simulate either a load test or a stress test, depending on the configuration.
      // Load test: expected usage.
      // Stress test: test the system's breaking point.
      export let options = {
        duration: '1m',

        // https://grafana.com/docs/k6/latest/misc/glossary/#virtual-user
        vus: 50, // Increase the number of Virtual Users to simulate more concurrent requests

        // https://grafana.com/docs/k6/latest/using-k6/thresholds/#fail-a-load-test-using-checks
        thresholds: { // thresholds are the fail/pass criteria
          'http_req_duration': ['p(95)<200'], // 95% of requests must finish within 200ms.
          'http_req_failed': ['rate<0.01'], // less than 1% of failed reqs
          'get_errors_counter': ['count<1'], // less than 1 error fetching
          'post_errors_counter': ['count<1'], // less than 1 error creating
          'delete_errors_counter': ['count<1'], // less than 1 error deleting
        },
      };

      export default function () {
        // https://grafana.com/docs/k6/latest/javascript-api/k6-http/set-response-callback/
        /* Make a broader check in response status if you want to check the response body
        For more detailed checks, use the k6 `check` function for the specific request. */
        http.setResponseCallback(http.expectedStatuses({ min: 200, max: 299 }));

        // Use groups to organize https://grafana.com/docs/k6/latest/using-k6/tags-and-groups/
        group('Get Events', () => {
          const getEventsResponse = http.get('http://localhost:3000/events');

          // Timings of HTTP requests: https://grafana.com/docs/k6/latest/examples/get-timings-for-an-http-metric/
          const getResponseDuration = getEventsResponse.timings.duration;
          reqDurationTimeGet.add(getResponseDuration);

          if (getEventsResponse.status < 200 || getEventsResponse.status >= 300) {
            getCounterErrors.add(1);
          }
        });

        let createdEventId = null;
        group('Create Event', () => {
          const newEvent = JSON.stringify({ name: 'Sample Event', date: '2024-10-09' });
          const postEventsResponse = http.post('http://localhost:3000/events', newEvent, {
            headers: { 'Content-Type': 'application/json' },
          });
          createdEventId = postEventsResponse.json().id
          // Here we are returning a json from the API
          // But you can also use parseHTML to test Server side rendering https://grafana.com/docs/k6/latest/examples/parse-html/

          const postResponseTime = postEventsResponse.timings.duration;
          reqDurationTimePost.add(postResponseTime);

          if (postEventsResponse.status < 200 || postEventsResponse.status >= 300) {
            postCounterErrors.add(1);
          }
        });

        if (createdEventId) {
          group('Delete Event', () => {
            const deleteEventResponse = http.del(`http://localhost:3000/events/${createdEventId}`);

            const deleteResponseTime = deleteEventResponse.timings.duration;
            reqDurationTimeDelete.add(deleteResponseTime);

            if (deleteEventResponse.status < 200 || deleteEventResponse.status >= 300) {
              deleteCounterErrors.add(1);
            }
          });
        }

        sleep(1); // simulate realistic user behavior (wait 1 second after requests)
        // if you want a burst of requests use a short sleep --> sleep(0.1);
      }

      // There are many other resources to explore, for example:
      // - Handling error: https://grafana.com/docs/k6/latest/examples/error-handler/
      // - Custom summary report: https://grafana.com/docs/k6/latest/results-output/end-of-test/custom-summary/
      // And much more that you can find at: https://grafana.com/docs/k6/latest
  ```

### Running Your k6 Test
  1. First of all [install k6](https://grafana.com/docs/k6/latest/set-up/install-k6/)
      - MacOS `brew install k6`
  2. Write your tests
  3. Execute your tests and export logs to a JSON file (this will also generate an HTML report and open a real-time dashboard):
      - `K6_WEB_DASHBOARD=true K6_WEB_DASHBOARD_OPEN=true K6_WEB_DASHBOARD_EXPORT=html-report.html k6 run --http-debug api_k6_test.js --out json=k6-logs.json`
  4. Analyze Results:
      - To monitor real-time resource usage: `docker stats container_id`, to discover container_id use `docker ps`.
      - To view k6 metrics: use the web dashboard, read logs, or integrate with monitoring tools like New Relic, Grafana, etc.

### System Metrics Before and During Load Test
  You will notice that these metrics fluctuate. Additionally, using docker stats is not the best approach to analyze your system metrics; I am using it locally and limiting resources.
  - `Before running k6 tests`:
    <img src="https://iili.io/29G31Ll.png" alt="Docker stats before running k6 tests">
  - `During k6 tests`:
    <img src="https://iili.io/29GCtCG.png" alt="Docker stats during k6 tests">

### K6 Native Dashboard Results
  - <img src="./k6-html-dashboard.gif" alt="k6 Native Dashboard Results" />

### How to Analyze the K6 Dashboard Metrics
  - **First of all we need to understand the measures.**

  - **Units**:
    - `1 second (s)` = 1,000 milliseconds (ms)
    - `1 millisecond (ms)` = 1,000 microseconds (µs)
    - `1 microsecond (µs)` = 1,000 nanoseconds (ns)
  - **Response Time Metrics**
    - `avg`: Average response time of all requests.
    - `med`: Median response time; 50% of requests completed in this time or less.
    - `max`: Maximum response time observed across all requests.
    - `min`: Minimum response time observed across all requests.
    - `p90`: 90th percentile response time; 90% of requests completed in this time or less.
    - `p95`: 95th percentile response time; 95% of requests completed in this time or less.
    - `p99`: 99th percentile response time; 99% of requests completed in this time or less.

    Analyzing both average (`avg`) and median (`med`) response times is crucial. A single slow response can distort the average, while the median reflects typical performance. Reviewing maximum (`max`) and minimum (`min`) times provides context for the best and worst scenarios.

### Understanding the [Metrics](https://grafana.com/docs/k6/latest/examples/get-timings-for-an-http-metric/)
  - <img src="https://iili.io/291abOx.png" /> _this image is from k6 documentation_

## Where can I send my K6 Metrics and Logs

- **Grafana**: Visualization tool for performance metrics.
- **New Relic**: Cloud-based platform for application performance insights.
- **InfluxDB**: Time-series database for storing time-stamped metrics.
- **Datadog**: Real-time monitoring service for application metrics.
- **Prometheus**: Open-source toolkit for monitoring and alerting.
- **AWS CloudWatch**: Monitoring service for AWS resources.
- **Azure Monitor**: Comprehensive monitoring service for Azure resources and applications.
- **Google Cloud Monitoring**: Visibility tool for Google Cloud applications.

You can send alerts for metric thresholds and anomalies in most of these services, allowing you to take action when performance issues arise.

## How to Use k6 Tests in Production

1. `Integrating with Cloud Monitoring Tools`: You can integrate k6 with various cloud monitoring services like New Relic, Grafana Cloud, and AWS CloudWatch. These tools help you visualize test results, track performance metrics, and monitor system health. To set up integration, follow the documentation for each tool, usually involving API keys and configuration settings. This allows you to send your k6 metrics and logs directly to these platforms for real-time analysis and alerts.
  - If your infrastructure is on AWS, Azure, etc.. Probably you already have at least the system metrics you will need.
2. `Avoid Overloading Your Server`: Use a staging environment that mirrors production with the same resources and configurations. If testing directly in production, limit user load and monitor server performance to prevent real user impact.
3. `Analyze Results`: After running your tests, analyze the data to find areas for improvement.
4. **Bonus**: You can integrate your CI/CD pipelines to run performance tests automatically using k6. This allows you to ensure the stability and performance of your application with every code change or deployment.

## References

- https://www.thinkwithgoogle.com/marketing-strategies/app-and-mobile/mobile-page-speed-load-time/
- https://www.geeksforgeeks.org/non-functional-requirements-in-software-engineering/
- https://sematext.com/blog/api-monitoring/
- https://www.blobr.io/post/key-api-metrics
- https://apitoolkit.io/blog/the-most-important-metric/
- https://www.geeksforgeeks.org/software-testing-non-functional-testing/
- https://grafana.com/docs/k6/latest
- https://grafana.com/blog/2023/04/11/how-to-visualize-load-testing-results/

## Thanks for Reading!

- Feel free to reach out if you have any questions, feedback, or suggestions. Your engagement is appreciated!

## Contacts

- You can find this and more content on:
  - [My website](https://godinhojoao.com/)
  - [GitHub](https://github.com/godinhojoao)
  - [LinkedIn](https://www.linkedin.com/in/joaogodinhoo/)
  - [Dev Community](https://dev.to/godinhojoao)
