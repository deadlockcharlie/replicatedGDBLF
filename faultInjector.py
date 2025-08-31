#!/usr/bin/env python3
import os
import random
import time
import subprocess

# Directory containing your docker-compose files (not strictly needed now)
COMPOSE_DIR = "./replicas"

# Shared network for inter-app communication
SHARED_NET = "Shared_net"

# Fault timing
FAULT_DURATION = 5
COOLDOWN = 30

def run(cmd):
    """Run a shell command and return output"""
    print(">", " ".join(cmd))
    try:
        return subprocess.check_output(cmd, stderr=subprocess.STDOUT).decode().strip()
    except subprocess.CalledProcessError as e:
        print("⚠️ Error:", e.output.decode())
        return None

def list_app_containers():
    """List all running containers whose names start with 'Replica'"""
    out = run(["docker", "ps", "--format", "{{.Names}}"])
    if not out:
        return []
    return [name for name in out.splitlines() if name.startswith("Replica")]

def get_ip(container, network=SHARED_NET):
    """Get container IP in the shared network"""
    return run([
        "docker", "inspect", "-f",
        f"{{{{.NetworkSettings.Networks.{network}.IPAddress}}}}",
        container
    ])

def main():
    while True:
        containers = list_app_containers()
        if len(containers) < 2:
            print("⚠️ Not enough app containers running")
            time.sleep(10)
            continue

        # Pick a replica to disconnect. It could be the leader too. 
        replica = random.choice(containers)

        # Pick a random fault
        action = random.choice(["partition"])

        if action == "partition":
            # Partition replica from shared network
            print(f"🚫 Disconnecting {replica} from {SHARED_NET}")
            run(["docker", "network", "disconnect", SHARED_NET, replica])

            time.sleep(FAULT_DURATION)

            # Heal (reconnect to network)
            print(f"✨ Reconnecting {replica} to {SHARED_NET}")
            run(["docker", "network", "connect", SHARED_NET, replica])


        print("⏳ Cooling down...")
        time.sleep(COOLDOWN)

if __name__ == "__main__":
    main()
