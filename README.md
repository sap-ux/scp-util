# SCP Utilities

This project hosts utilities for managing SCP services and applications. 

## Stop Unused Cloud Foundry Apps

This nodejs program identifies and stops unused applications in Cloud Foundry to save unecessary cost. 

Usage:
````
node stop_unused_apps.js <user> <password> <org> <space> <max_idle_hours>
````