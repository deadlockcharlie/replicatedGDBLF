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
FAULT_DURATION = 15
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

        # Pick two distinct containers
        src, dst = random.sample(containers, 2)
        dst_ip = get_ip(dst, SHARED_NET)
        if not dst_ip:
            print(f"⚠️ Could not get IP for {dst} in network {SHARED_NET}")
            time.sleep(10)
            continue

        # Pick a random fault
        action = random.choice(["partition"])

        if action == "partition":
            print(f"🚫 Partitioning {src} → {dst}")
            run(["docker", "exec", src, "iptables", "-A", "OUTPUT", "-d", dst_ip, "-j", "DROP"])
            time.sleep(FAULT_DURATION)
            print(f"✨ Healing {src} → {dst}")
            run(["docker", "exec", src, "iptables", "-D", "OUTPUT", "-d", dst_ip, "-j", "DROP"])

        elif action == "delay":
            print(f"🐢 Adding latency on {src}")
            run(["docker", "exec", src, "tc", "qdisc", "add", "dev", "eth0", "root", "netem", "delay", "300ms"])
            time.sleep(FAULT_DURATION)
            print(f"✨ Restoring normal latency on {src}")
            run(["docker", "exec", src, "tc", "qdisc", "del", "dev", "eth0", "root"])
            
        print("⏳ Cooling down...")
        time.sleep(COOLDOWN)

if __name__ == "__main__":
    main()
