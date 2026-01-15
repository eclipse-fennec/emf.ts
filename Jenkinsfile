pipeline {
    agent any

    tools {
        nodejs 'NodeJS22'
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '5'))
    }

    stages {
        stage('Clean Workspace') {
            steps {
                cleanWs()
            }
        }

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install') {
            steps {
                sh 'npm ci'
            }
        }

        stage('Test') {
            steps {
                sh 'npm run test:run'
            }
        }

        stage('Build') {
            steps {
                sh 'npm run build'
            }
        }

        stage('Publish Release') {
            when {
                branch 'main'
            }
            environment {
                NPM_TOKEN = credentials('npm-token')
            }
            steps {
                echo "Publishing release version on branch: ${env.BRANCH_NAME}"
                sh '''
                    echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > .npmrc
                    npm publish --access public
                '''
            }
        }

        stage('Publish Snapshot') {
            when {
                branch 'snapshot'
            }
            environment {
                NPM_TOKEN = credentials('npm-token')
            }
            steps {
                echo "Publishing snapshot version on branch: ${env.BRANCH_NAME}"
                sh '''
                    echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > .npmrc

                    # Get current version and append snapshot suffix
                    CURRENT_VERSION=$(node -p "require('./package.json').version")
                    SNAPSHOT_VERSION="${CURRENT_VERSION}-snapshot.${BUILD_NUMBER}"

                    # Update version for snapshot
                    npm version ${SNAPSHOT_VERSION} --no-git-tag-version

                    # Publish with snapshot tag
                    npm publish --tag snapshot --access public
                '''
            }
        }

        stage('Build Only') {
            when {
                allOf {
                    not { branch 'main' }
                    not { branch 'snapshot' }
                }
            }
            steps {
                echo "Build completed on branch: ${env.BRANCH_NAME} (no publish)"
            }
        }
    }

    post {
        always {
            cleanWs()
        }
    }
}
