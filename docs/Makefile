.PHONY: serve book clean

BIN_DIR := $(shell pwd)/bin
MDBOOK_BIN := $(BIN_DIR)/mdbook
MDBOOK_VERSION ?= v0.4.4

build: $(MDBOOK_BIN)
	$(MDBOOK_BIN) build

serve: $(MDBOOK_BIN)
	$(MDBOOK_BIN) serve

install-mdbook: $(MDBOOK_BIN)

$(MDBOOK_BIN):
	mkdir -p $(BIN_DIR)
	curl -Lo /tmp/mdbook.tar.gz https://github.com/rust-lang/mdBook/releases/download/$(MDBOOK_VERSION)/mdbook-$(MDBOOK_VERSION)-x86_64-unknown-linux-gnu.tar.gz
	tar -C $(BIN_DIR) -xf /tmp/mdbook.tar.gz

clean:
	rm -f $(MDBOOK_BIN)
