# k8s-prometheus-metrics
Library for an express listener on default prometheus port to provide your app metrics to prometheus server.
Also provides container resource metrics.

## Usage
```javascript
var prometheus = require('k8s-prometheus-metrics')();
const monitor = {
	in: new prometheus.Counter({ name: 'mock_ti_incoming', help: 'count of incoming messages' }),
	processed: new prometheus.Counter({ name: 'mock_ti_processes', help: 'count of incoming messages processed' }),
	out: new prometheus.Counter({ name: 'mock_ti_outgoing', help: 'count of outgoing messages', labelNames: [ 'messageType' ] })
};
```

## Dependencies
* express
* prom-client

## Default container resource metrics
### Utilization
* container_cpu_utilization
* container_memory_utilization
* container_disk_utilization
### Network
* container_bytes_sent
* container_bytes_received
* container_network_errors
### Memory
* container_memory_page_faults
### Other
* container_uptime
