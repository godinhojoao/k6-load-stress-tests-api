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
  thresholds: { // thresholds are the fail/pass criterias
    'http_req_duration': ['p(95)<200'], // 95% of requests must finish within 200ms.
    'http_req_failed': ['rate<0.01'], // less than 1% of failed reqs
    'get_errors_counter': ['count<1'], // less than 1 error fetching
    'post_errors_counter': ['count<1'], // less than 1 error creating
    'delete_errors_counter': ['count<1'], // less than 1 error deleting
  },
};

export default function () {
  // https://grafana.com/docs/k6/latest/javascript-api/k6-http/set-response-callback/
  /* Make a broader check in response status, if you want to check response body
  or more detailed checks use the k6 `check` function for the specific request. */
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