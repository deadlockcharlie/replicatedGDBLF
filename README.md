Replication middleware with leader follower sync
====

This is a middlware implementation for replicating graph databases via leader follower synchronization


How to run
====

The application is implemented as a nodejs server. To install node packages, run `npm install`. 

This project also uses python for deploying docker containers. Ensure that python and docker-cli are installed and available in the shell.

To start a deployment, change the relevant parameters in `DistributionConfig.json`. Then use the following command `python3 Deployment.py up`. This well setup the networks and build all the containers with port forwarding. 

The first database specified in the distributin configuration will seve as the leader and any remaning databases will be followers. 

A deployment can be shutdown gracefully via `python3 Deployment.py down`. This will remove all the containers for the deployment and also remove the networks. 


