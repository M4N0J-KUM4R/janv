FROM eclipse-temurin:21-jre-alpine

RUN apk add --no-cache openjdk21

RUN adduser -D -u 1000 runner

WORKDIR /tmp
USER runner
