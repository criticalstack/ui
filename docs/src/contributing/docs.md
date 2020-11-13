# Documentation

This documentation is generated from markdown using [mdbook](https://rust-lang.github.io/mdBook/).

Use the Makefile in the `client/` directory to update and view docs.

```shell
$ cd client/
$ make build
```

The appropriate version of `mdbook` will automatically be installed to `./client/bin/mdbook`.

To see a live-reloading preview of changes:

```shell
$ make serve
```

Open [localhost:3000](http://localhost:3000) to view your rendered pages.
