// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "Produla",
    platforms: [.macOS(.v13)],
    products: [.executable(name: "Produla", targets: ["Produla"])],
    dependencies: [
        .package(url: "https://github.com/vapor/vapor.git", from: "4.115.0")
    ],
    targets: [
        .executableTarget(name: "Produla", dependencies: [.product(name: "Vapor", package: "vapor")])
    ]
)
