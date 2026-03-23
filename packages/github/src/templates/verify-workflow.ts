export function verifyWorkflowYaml(opts: { dir: string; branch: string }): string {
  const { dir, branch } = opts;
  // $ is used as a raw dollar sign in the shell script portions (not template interpolation)
  const S = "$";
  return `name: Glory Chain Verify

on:
  pull_request:
    branches: [${branch}]
    paths: ['${dir}/**']

concurrency:
  group: glorychain-verify-${S}{{ github.ref }}
  cancel-in-progress: true

jobs:
  verify:
    name: Verify chains
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Verify all chains
        shell: bash
        run: |
          shopt -s nullglob
          chains=(${dir}/*.json)
          if [ ${S}{#chains[@]} -eq 0 ]; then
            echo "No chain files found in ${dir}/ — skipping verification."
            exit 0
          fi
          failed=0
          for f in "${S}{chains[@]}"; do
            chainId="${S}(basename "${S}f" .json)"
            echo "Verifying chain: ${S}chainId"
            if ! npx --yes glorychain@latest verify --chain "${S}chainId" --dir "${dir}"; then
              echo "FAILED: ${S}chainId"
              failed=1
            fi
          done
          exit ${S}failed
`;
}
