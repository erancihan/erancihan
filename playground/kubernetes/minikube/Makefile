apply:
	kubectl apply -f config.yaml
	@echo Check pods...
	kubectl get pods
	@echo Check deployments...
	kubectl get deployments
	@echo Check services...
	kubectl get service

delete:
	kubectl delete -f config.yaml

# run minikube tunnel in the background. store the process id in a file
# to kill the process later.
tunnel-up:
	minikube tunnel & echo $$! > tunnel.pid

# kill the tunnel process
tunnel-down:
	kill -9 `cat tunnel.pid` &&	rm tunnel.pid
