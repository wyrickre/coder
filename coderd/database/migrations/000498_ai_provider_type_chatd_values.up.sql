-- Widen ai_provider_type to carry the full chatd provider set so the
-- chatd-side migration can preserve type fidelity when it lands. The
-- aibridge runtime currently has native support only for OpenAI and
-- Anthropic (with a Bedrock variant on the Anthropic client); the new
-- non-Bedrock types route through the OpenAI fantasy client today
-- because chatd already configures these providers against their
-- OpenAI-compatible endpoints. Native gateway-side support for these
-- providers comes later, at which point this enum already carries the
-- right discriminator and no further migration is needed.
--
-- openai-compat is intentionally NOT added. Operators configure an
-- OpenAI-compatible upstream by inserting an ai_providers row of type
-- 'openai' with the upstream's base_url; that already works.
ALTER TYPE ai_provider_type ADD VALUE IF NOT EXISTS 'azure';
ALTER TYPE ai_provider_type ADD VALUE IF NOT EXISTS 'bedrock';
ALTER TYPE ai_provider_type ADD VALUE IF NOT EXISTS 'google';
ALTER TYPE ai_provider_type ADD VALUE IF NOT EXISTS 'openrouter';
ALTER TYPE ai_provider_type ADD VALUE IF NOT EXISTS 'vercel';
