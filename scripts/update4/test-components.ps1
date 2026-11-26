$ErrorActionPreference = 'Stop'
$selectedTests = @(
  'src/components/PermanentIdentificationHeader.test.tsx',
  'src/features/catalog/CurrentClassificationFlags.test.tsx',
  'src/features/catalog/OriginalSourceBridgeNovember.test.tsx',
  'src/features/catalog/OriginalSourceBridge7P.test.tsx',
  'src/features/catalog/LocalityCardForm.stabilization.test.tsx',
  'src/features/catalog/LocalityActions.stabilization.test.tsx',
  'src/lib/formSaveState.test.ts',
  'src/features/scoped/SourceMatTech.test.tsx',
  'src/components/MatTechGroups.test.tsx',
  'src/components/MatTechPositions.test.tsx',
  'src/components/MatTechAutoSelection.test.tsx',
  'src/components/Batch23MatTech.test.tsx',
  'src/components/MuseumSection.test.tsx',
  'src/components/MuseumSectionNovember.test.tsx',
  'src/components/CompletionProfessional.test.tsx',
  'src/features/catalog/AuthorityAndSpecialist.test.tsx'
)
node node_modules/vitest/vitest.mjs run @selectedTests --maxWorkers=1 --no-file-parallelism
exit $LASTEXITCODE
