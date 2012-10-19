output_file = "edtf"

js_files = \
	src/start.js \
	src/validate.js \
	src/parse.js \
	src/end.js

all: bundle minify

bundle:
	@cat $(js_files) > $(output_file).js

minify:
	@uglifyjs $(output_file).js > $(output_file).min.js

