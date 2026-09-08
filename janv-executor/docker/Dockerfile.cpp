FROM alpine:3.20

RUN apk add --no-cache g++ musl-dev

RUN adduser -D -u 1000 runner

WORKDIR /tmp
USER runner
