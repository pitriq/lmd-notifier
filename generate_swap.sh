#!/bin/bash

# Check if swap is already enabled
if swapon --show | grep -q '/swapfile'; then
    echo "Swap is already enabled"
    exit 0
fi

# Create swap file
sudo fallocate -l 3G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab