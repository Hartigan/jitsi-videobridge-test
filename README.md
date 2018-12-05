# jitsi-videobridge-test
Load test for [jitsi-videobridge](https://github.com/jitsi/jitsi-videobridge)
`Node.js` applicatoin which runs headless `Chrome` instances for create and join conferences via [jitsi-videobridge](https://github.com/jitsi/jitsi-videobridge).

# Prerequisite

`Node.js` & `Node Package Manager (npm)` is intalled on target machine

# Installing dependencies

```
> npm install
```

# Building `TypeScript` files:

```
> npm run build
```

# Launching load test application:

```
> npm run test -- [args]
```

# Example of invocation:

```
src> npm run test -- -c 15 -p 5 -t 300 -d 5000 -a "https://people.xiph.org/~giles/2012/opus/ehren-paper_lights-96.opus" -e http://localhost:8080
```

Test creates `-c 15` conferences on `-e "https://localhost:8080"` instance with `-p 5` peers in each conference.

Peers will be connected to conferences during `-t 300` **seconds** before disconnect.

Delay before creating next conferences is `-d 5000` milliseconds. 

Play content of `-a "https://people.xiph.org/~giles/2012/opus/ehren-paper_lights-96.opus"` as "voice" when connected to conference.
