#!/bin/bash

# DEFINE THE PATH HERE TO THE LOCAL SERVICE NEEDING TO DEPEND ON THIS LIBRARY
pathToLocalService='../sprintingidp/idp'

# Save the current directory
currentDir=$(pwd)
# Get the version from package.json
version=$(grep '"version"' package.json | awk -F '"' '{print $4}')

# Run build-local and pack the npm package
npm run build-local && npm pack

# Check if npm pack succeeded
if [ $? -ne 0 ]; then
  echo "npm pack failed"
  exit 1
fi

# Get the packed file name
packageName="sprinting-retail-common-${version}.tgz"

# Ensure the packed file exists
if [ ! -f "${currentDir}/${packageName}" ]; then
  echo "Package file ${packageName} not found in ${currentDir}"
  exit 1
fi

# Change to the local service directory
cd ${pathToLocalService}

# Check if the change directory was successful
if [ $? -ne 0 ]; then
  echo "Failed to change directory to ${pathToLocalService}"
  exit 1
fi

# Install the package using the absolute path
npm install ${currentDir}/${packageName}

# Check if npm install succeeded
if [ $? -ne 0 ]; then
  echo "npm install failed"
  exit 1
fi

# Return to the original directory
cd ${currentDir}
