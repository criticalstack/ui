# This dockerfile is specifically for running with tilt
FROM alpine
WORKDIR /
COPY ./client/build /client/build
COPY ./bin/ui /ui
ENTRYPOINT /ui
