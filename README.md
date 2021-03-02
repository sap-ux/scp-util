# SCP Utilities

This project hosts utilities for managing SCP services and applications. 

## Stop Unused Cloud Foundry Apps

This nodejs program identifies and stops unused applications in Cloud Foundry to save unecessary cost. 

Usage:
````
node stop-unused-apps.js <cfUser> <cfPassword> <cfOrg> <cfSpace> <maxIdleHours>
````