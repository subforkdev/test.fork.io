# Copyright (c) 2024 Subfork. All rights reserved.
#
# This source code is the property of company.com and is protected by
# copyright law and international treaties. Unauthorized reproduction
# or distribution of this code, or any portion of it, may result in
# severe civil and criminal penalties and will be prosecuted to the
# maximum extent possible under the law.

# Define the python and pip executables
PYTHON_EXECUTABLE := /usr/bin/python3  # $(shell which python3)
PIP_EXECUTABLE := $(shell $(PYTHON_EXECUTABLE) -m pip --version >/dev/null 2>&1 && echo "pip" || echo "")

# Defaults (can be overridden via command line)
APP ?= $(notdir $(shell pwd))

# Set ENV based on the current git branch
ENV ?= prod
CURRENT_BRANCH := $(shell git rev-parse --abbrev-ref HEAD)
ifneq (,$(filter $(CURRENT_BRANCH),main master))
	ENV := prod
else
	ENV := dev
endif

# Other defaults
ENVPATH ?= .
BUILD_DIR ?= ./build
INSTALL_DIR ?= /etc/${APP}

# Define the systemd service name and file destination
SERVICE_NAME := ${APP}.service
SERVICE_SRC := /etc/${APP}/${ENV}/conf/${SERVICE_NAME}
SERVICE_DEST := /etc/systemd/system/${SERVICE_NAME}

# Define the install commands
ENVSTACK_CMD := ${BUILD_DIR}/bin/envstack
DISTMAN_CMD := ${BUILD_DIR}/bin/distman
SUBFORK_CMD := ${BUILD_DIR}/bin/subfork
DIST_CMD := sudo ENV=${ENV} ROOT=${INSTALL_DIR} PYTHONPATH=${BUILD_DIR} ENVPATH=${ENVPATH} -E ${DISTMAN_CMD}
DEPLOY_CMD := ENV=${ENV} PYTHONPATH=${BUILD_DIR} ENVPATH=${ENVPATH} ${SUBFORK_CMD}
TEST_CMD := ENV=${ENV} PYTHONPATH=${BUILD_DIR} ENVPATH=${ENVPATH} ${ENVSTACK_CMD}

# Check if the app name is set
check_app:
	@echo "App name: ${APP}"
	@if [ -z "$(APP)" ]; then \
		echo "Error: APP is not set"; \
		exit 1; \
	fi

# Check python3 version >= 3.8
check_python:
	@if [ -z "$(PYTHON_EXECUTABLE)" ]; then \
		echo "Error: Python3 not found"; \
		exit 1; \
	fi
	@PYTHON_VERSION=$$($(PYTHON_EXECUTABLE) --version 2>&1 | awk '{print $$2}'); \
	if [ -z "$$PYTHON_VERSION" ]; then \
		echo "Error: Could not determine Python version"; \
		exit 1; \
	fi; \
	VERSION_MAJOR=$$(echo $$PYTHON_VERSION | cut -d. -f1); \
	VERSION_MINOR=$$(echo $$PYTHON_VERSION | cut -d. -f2); \
	if [ $$VERSION_MAJOR -lt 3 ] || { [ $$VERSION_MAJOR -eq 3 ] && [ $$VERSION_MINOR -lt 8 ]; }; then \
		echo "Error: Python version must be at least 3.8. Found $$PYTHON_VERSION"; \
		exit 1; \
	fi
	@echo "Using python runtime: ${PYTHON_EXECUTABLE}"

# Check if pip is installed
check_pip: check_python
	@if [ -z "$(PIP_EXECUTABLE)" ]; then \
		echo "Error: pip is not installed. Install it with: $(PYTHON_EXECUTABLE) -m ensurepip --upgrade"; \
		exit 1; \
	fi
	@echo "pip is installed"

# Check if requirements.txt exists
check_requirements: check_pip
	@if [ ! -f requirements.txt ]; then \
		echo "Error: requirements.txt not found"; \
		exit 1; \
	fi
	@echo "requirements.txt found"

# Clean target to remove the build directory
clean:
	rm -rf build

# Check if the build directory exists
check_build:
	@if [ ! -d "${BUILD_DIR}" ]; then \
		echo "Error: Build directory not found. Run 'make build' first."; \
		exit 1; \
	fi
	@echo "Build directory exists: ${BUILD_DIR}"

# Check if the install directory exists
check_install: check_app
	@if [ ! -d "${INSTALL_DIR}" ]; then \
		echo "Error: Install directory not found. Run 'make install' first."; \
		exit 1; \
	fi
	@echo "Install directory exists: ${INSTALL_DIR}"

# Check the versions of distman and subfork
version_check: check_build
	@echo "Current branch: ${CURRENT_BRANCH}"
	@echo "APP=${APP}"
	@echo "ENV=${ENV}"
	@echo "SERVICE_SRC=${SERVICE_SRC}"
	${DEPLOY_CMD} --version
	${DIST_CMD} --version

# Build the requirements
build: clean check_requirements
	@echo "Building requirements.txt"
	${PYTHON_EXECUTABLE} -m pip install -r requirements.txt -t ${BUILD_DIR}

# Test the build
test: check_build
	@echo "Running test"
	${TEST_CMD} test -- subfork worker

# Perform an install dry run
dryrun: check_build
	@echo "Installing to ${ENV} environment (dryrun)"
	${DIST_CMD} --force -y --dryrun

# Install using the dist command
install: check_build
	@echo "Installing to ${ENV} environment"
	${DIST_CMD} --force -y
	@if [ -f keys.env ]; then \
		sudo cp keys.env ${INSTALL_DIR}/prod/env; \
	fi
	@if [ -f secrets.env ]; then \
		sudo cp secrets.env ${INSTALL_DIR}/prod/env; \
	fi

# Start the app worker service
# Note: systemd does not like nested links and is very strict on naming:
#  Failed to link unit: Too many levels of symbolic links
#  "app.service.0.abc123" which is not a valid unit name: Invalid cross-device link
#  Failed to enable unit: File app.service: Invalid argument
start: check_install
	@echo "Preparing to start ${APP}..."
	@if [ -f "${SERVICE_SRC}" ]; then \
		echo "Deploying service file: ${SERVICE_SRC} → ${SERVICE_DEST}"; \
		sudo cp -f "${SERVICE_SRC}" "${SERVICE_DEST}"; \
		echo "Reloading systemd daemon..."; \
		sudo systemctl daemon-reload; \
	else \
		echo "No systemd service file found at ${SERVICE_SRC}. Skipping deployment."; \
	fi
	@echo "Starting ${APP} (if applicable)"
	-@sudo systemctl start ${APP} 2>/dev/null || echo "Warning: Failed to start ${APP}"

# Stop the app service
stop:
	@echo "Stopping ${APP} (if applicable)"
	-@sudo systemctl stop ${APP} 2>/dev/null || echo "Warning: Failed to stop ${APP}"

# Restart the app service
restart:
	@echo "Restarting ${APP} (if applicable)"
	-@sudo systemctl restart ${APP} 2>/dev/null || echo "Warning: Failed to restart ${APP}"

# Check the status of the app
status:
	@echo "Status for ${APP}:"
	-@sudo systemctl status ${APP} || echo "No systemd unit found for ${APP}"

# Check if the app is enabled
enable:
	@echo "Checking if ${APP} is enabled"
	@if [ -f "${SERVICE_DEST}" ]; then \
		if ! sudo systemctl is-enabled ${APP} >/dev/null 2>&1; then \
			echo "Enabling ${APP} service..."; \
			sudo systemctl enable ${APP}; \
		else \
			echo "${APP} service is already enabled."; \
		fi \
	else \
		echo "Cannot enable: no systemd unit at ${SERVICE_DEST}"; \
	fi

# Deploy the app to subfork
deploy:
	@echo "Deploying app to subfork"
	${DEPLOY_CMD} deploy

# Phony targets
.PHONY: build dryrun install clean stop start restart
