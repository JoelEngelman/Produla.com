FROM swift:6.0-noble AS build
WORKDIR /app
COPY Package.swift ./
RUN swift package resolve
COPY Sources ./Sources
RUN swift build -c release --static-swift-stdlib

FROM ubuntu:24.04
RUN apt-get update && apt-get install -y ca-certificates tzdata libcurl4 libxml2 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /app/.build/release/Produla /app/Produla
COPY Public /app/Public
ENV PORT=8080
EXPOSE 8080
CMD ["/app/Produla"]
