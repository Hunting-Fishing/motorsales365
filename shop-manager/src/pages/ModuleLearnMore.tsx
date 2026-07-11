import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle, Users, Zap, X, Check, Shield, Eye } from 'lucide-react';
import { LANDING_MODULES } from '@/config/landingModules';
import { ScreenshotGallery } from '@/components/landing/ScreenshotGallery';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { motion } from 'framer-motion';
import { WorkflowPreviewModal } from '@/components/landing/WorkflowPreviewModal';

export default function ModuleLearnMore() {
  const { slug } = useParams();
  const module = LANDING_MODULES.find((item) => item.slug === slug);
  const [previewStep, setPreviewStep] = useState<{ step: number; title: string } | null>(null);

  if (!module) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Module not found</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              The module you requested is not available yet.
            </p>
            <Button asChild>
              <Link to="/#modules">Back to modules</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const Icon = module.icon;

  return (
    <div className="min-h-screen bg-background font-['Space_Grotesk',sans-serif]">
      {/* Sticky Back Navigation */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur border-b border-border">
        <div className="container mx-auto px-6 h-12 flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild className="gap-1.5 text-muted-foreground hover:text-foreground">
            <Link to="/#modules">
              <ArrowLeft className="h-4 w-4" />
              Back to Modules
            </Link>
          </Button>
          <span className="text-sm font-medium text-foreground truncate">{module.name}</span>
        </div>
      </div>

      {/* Hero Section with Stats */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-primary/10 via-primary/5 to-background">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8 items-start">
              <motion.div 
                className="md:col-span-2 space-y-6"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center ${module.color} shadow-lg`}>
                  <Icon className="h-10 w-10 text-white" />
                </div>
                {module.tagline && (
                  <p className="text-lg font-semibold text-primary uppercase tracking-wide">{module.tagline}</p>
                )}
                <h1 className="text-4xl md:text-6xl font-bold text-foreground leading-tight">
                  {module.name}
                </h1>
                <p className="text-xl text-muted-foreground">{module.description}</p>
                {module.longDescription && (
                  <div className="text-muted-foreground space-y-4 leading-relaxed text-lg">
                    {module.longDescription.split('\n\n').map((para, idx) => (
                      <p key={idx}>{para}</p>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-4 pt-4">
                  <Button asChild size="lg" className="text-lg px-8">
                    <Link to="/staff-login">
                      Start Free Trial
                      <ArrowRight className="h-5 w-5 ml-2" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="text-lg px-8">
                    <Link to="/#modules">View All Modules</Link>
                  </Button>
                </div>
              </motion.div>
              {module.price && (
                <motion.div 
                  className="rounded-2xl border bg-card p-8 shadow-xl"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                >
                  <p className="text-sm uppercase tracking-wide text-muted-foreground font-semibold">Starting at</p>
                  <p className="text-5xl font-bold text-primary mt-2">{module.price}</p>
                  <p className="text-sm text-muted-foreground mt-1">per month</p>
                  <Button asChild className="mt-6 w-full" size="lg">
                    <Link to="/staff-login">
                      Get Started
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                  <p className="text-xs text-muted-foreground text-center mt-3">
                    14-day free trial • No credit card required
                  </p>
                </motion.div>
              )}
            </div>

            {/* Capability Highlights (not fake stats) */}
            {module.stats && module.stats.length > 0 && (
              <motion.div 
                className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                {module.stats.map((stat) => (
                  <div key={stat.label} className="text-center p-6 rounded-xl bg-card border">
                    <p className="text-2xl md:text-3xl font-bold text-primary">{stat.value}</p>
                    <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
                  </div>
                ))}
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* Screenshot Gallery */}
      {module.screenshots && module.screenshots.length > 0 && (
        <ScreenshotGallery screenshots={module.screenshots} moduleName={module.name} />
      )}

      {/* Who It's For */}
      {module.idealFor && module.idealFor.length > 0 && (
        <section className="py-16 border-b">
          <div className="container mx-auto px-6">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center gap-3 mb-8">
                <Users className="h-7 w-7 text-primary" />
                <h2 className="text-3xl font-bold">Built For Your Business</h2>
              </div>
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                {module.idealFor.map((audience) => (
                  <motion.div
                    key={audience}
                    className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex items-center gap-3"
                    whileHover={{ scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <CheckCircle className="h-5 w-5 text-primary shrink-0" />
                    <span className="font-medium">{audience}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Before vs After Comparison */}
      {module.comparisonPoints && module.comparisonPoints.length > 0 && (
        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-6">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">See the Difference</h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Transform how you run your business with tools designed to eliminate frustration and boost efficiency.
                </p>
              </div>
              <div className="grid md:grid-cols-2 gap-8">
                {/* Without Column */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                      <X className="h-5 w-5 text-red-600" />
                    </div>
                    <h3 className="text-xl font-bold text-red-600">The Old Way</h3>
                  </div>
                  {module.comparisonPoints.map((point, idx) => (
                    <motion.div
                      key={idx}
                      className="p-4 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3"
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      viewport={{ once: true }}
                    >
                      <X className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                      <span className="text-red-900">{point.without}</span>
                    </motion.div>
                  ))}
                </div>
                {/* With Column */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                      <Check className="h-5 w-5 text-emerald-600" />
                    </div>
                    <h3 className="text-xl font-bold text-emerald-600">With ShopCore</h3>
                  </div>
                  {module.comparisonPoints.map((point, idx) => (
                    <motion.div
                      key={idx}
                      className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 flex items-start gap-3"
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      viewport={{ once: true }}
                    >
                      <Check className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="text-emerald-900">{point.with}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* How It Works - Workflow Steps (CLICKABLE) */}
      {module.workflowSteps && module.workflowSteps.length > 0 && (
        <section className="py-20">
          <div className="container mx-auto px-6">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  From customer check-in to final payment, every step is streamlined. <span className="text-primary font-medium">Click any step to see it in action.</span>
                </p>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {module.workflowSteps.map((step) => {
                  const StepIcon = step.icon;
                  return (
                    <motion.div
                      key={step.step}
                      className="relative cursor-pointer group"
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ delay: step.step * 0.1 }}
                      viewport={{ once: true }}
                      onClick={() => setPreviewStep({ step: step.step, title: step.title })}
                    >
                      <Card className="h-full hover:shadow-xl hover:border-primary/50 transition-all group-hover:scale-[1.02]">
                        <CardContent className="pt-6">
                          <div className="flex items-center gap-4 mb-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${module.color}`}>
                              <StepIcon className="h-6 w-6 text-white" />
                            </div>
                            <span className="text-4xl font-bold text-muted-foreground/30">
                              {String(step.step).padStart(2, '0')}
                            </span>
                          </div>
                          <h3 className="font-bold text-lg mb-2">{step.title}</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {step.description}
                          </p>
                          <div className="mt-4 flex items-center gap-2 text-primary text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                            <Eye className="h-4 w-4" />
                            <span>Click to preview</span>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Workflow Preview Modal */}
      {previewStep && (
        <WorkflowPreviewModal
          isOpen={!!previewStep}
          onClose={() => setPreviewStep(null)}
          stepNumber={previewStep.step}
          stepTitle={previewStep.title}
        />
      )}

      {/* Feature Highlights */}
      {module.featureHighlights && module.featureHighlights.length > 0 && (
        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-6">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center gap-3 mb-8">
                <Zap className="h-7 w-7 text-primary" />
                <h2 className="text-3xl font-bold">Powerful Features</h2>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {module.featureHighlights.map((feature) => {
                  const FeatureIcon = feature.icon;
                  return (
                    <motion.div
                      key={feature.title}
                      whileHover={{ y: -5 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <Card className="h-full hover:shadow-lg transition-shadow">
                        <CardContent className="pt-6">
                          <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${module.color} mb-4`}>
                            <FeatureIcon className="h-7 w-7 text-white" />
                          </div>
                          <h3 className="font-bold text-lg mb-2">{feature.title}</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {feature.description}
                          </p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Key Benefits */}
      {module.benefits && module.benefits.length > 0 && (
        <section className="py-20">
          <div className="container mx-auto px-6">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Shops Choose ShopCore</h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Purpose-built tools that help you work smarter, not harder.
                </p>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {module.benefits.map((benefit) => {
                  const BenefitIcon = benefit.icon;
                  return (
                    <motion.div
                      key={benefit.title}
                      whileHover={{ scale: 1.03 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <Card className="h-full text-center bg-gradient-to-b from-primary/5 to-transparent border-primary/20">
                        <CardContent className="pt-8 pb-6">
                          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${module.color} mx-auto mb-4`}>
                            <BenefitIcon className="h-8 w-8 text-white" />
                          </div>
                          <p className="text-sm font-semibold text-primary mb-2">{benefit.stat}</p>
                          <h3 className="font-bold text-lg mb-2">{benefit.title}</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {benefit.description}
                          </p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Core & Extra Features */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-6">
          <div className="grid gap-8 md:grid-cols-2 max-w-6xl mx-auto">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <CheckCircle className="h-6 w-6 text-primary" />
                  Core Capabilities
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {module.coreFeatures.map((feature) => (
                  <div key={feature} className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <p className="text-foreground">{feature}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <CheckCircle className="h-6 w-6 text-emerald-500" />
                  Extra Features
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {module.extraFeatures.map((feature) => (
                  <div key={feature} className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" />
                    <p className="text-foreground">{feature}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      {module.useCases && module.useCases.length > 0 && (
        <section className="py-20">
          <div className="container mx-auto px-6">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-3xl font-bold mb-8">Real-World Use Cases</h2>
              <div className="grid md:grid-cols-2 gap-6">
                {module.useCases.map((useCase, idx) => (
                  <motion.div
                    key={useCase.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    viewport={{ once: true }}
                  >
                    <Card className="h-full hover:shadow-lg transition-shadow">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-3 mb-3">
                          <span className={`w-10 h-10 rounded-full ${module.color} text-white flex items-center justify-center text-lg font-bold`}>
                            {idx + 1}
                          </span>
                          <h3 className="font-bold text-lg">{useCase.title}</h3>
                        </div>
                        <p className="text-muted-foreground ml-13 pl-10">
                          {useCase.description}
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Pricing Tiers */}
      {module.pricingTiers && module.pricingTiers.length > 0 && (
        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-6">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Choose the plan that fits your business. All plans include a 14-day free trial.
                </p>
              </div>
              <div className="grid md:grid-cols-3 gap-8">
                {module.pricingTiers.map((tier) => (
                  <motion.div
                    key={tier.name}
                    whileHover={{ y: -5 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <Card className={`h-full relative ${tier.highlighted ? 'border-primary border-2 shadow-xl' : ''}`}>
                      {tier.highlighted && (
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">
                          Most Popular
                        </div>
                      )}
                      <CardHeader className="text-center pb-4">
                        <CardTitle className="text-xl">{tier.name}</CardTitle>
                        <div className="mt-4">
                          <span className="text-4xl font-bold">{tier.price}</span>
                          <span className="text-muted-foreground">{tier.period}</span>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {tier.features.map((feature) => (
                          <div key={feature} className="flex items-start gap-3">
                            <CheckCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                            <span className="text-sm">{feature}</span>
                          </div>
                        ))}
                        <Button 
                          asChild 
                          className="w-full mt-6" 
                          variant={tier.highlighted ? 'default' : 'outline'}
                          size="lg"
                        >
                          <Link to="/staff-login">
                            {tier.price === 'Custom' ? 'Contact Sales' : 'Start Free Trial'}
                          </Link>
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Trust & Security Badges */}
      {module.trustBadges && module.trustBadges.length > 0 && (
        <section className="py-16">
          <div className="container mx-auto px-6">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-10">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <Shield className="h-7 w-7 text-primary" />
                  <h2 className="text-2xl font-bold">Enterprise-Grade Security</h2>
                </div>
                <p className="text-muted-foreground">Your data is protected by industry-leading security measures</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {module.trustBadges.map((badge) => {
                  const BadgeIcon = badge.icon;
                  return (
                    <div key={badge.title} className="text-center p-6 rounded-xl bg-card border">
                      <BadgeIcon className="h-10 w-10 text-primary mx-auto mb-3" />
                      <h3 className="font-semibold mb-1">{badge.title}</h3>
                      <p className="text-xs text-muted-foreground">{badge.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Integrations */}
      {module.integrations && module.integrations.length > 0 && (
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-6">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-2xl font-bold mb-6">Integrations & Compatibility</h2>
              <div className="flex flex-wrap gap-3">
                {module.integrations.map((integration) => (
                  <span
                    key={integration}
                    className="px-5 py-3 rounded-lg border bg-card text-sm font-medium hover:border-primary transition-colors"
                  >
                    {integration}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* FAQs */}
      {module.faqs && module.faqs.length > 0 && (
        <section className="py-20">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold mb-10 text-center">Frequently Asked Questions</h2>
              <Accordion type="single" collapsible className="space-y-4">
                {module.faqs.map((faq, idx) => (
                  <AccordionItem key={idx} value={`faq-${idx}`} className="bg-card rounded-xl border px-6 shadow-sm">
                    <AccordionTrigger className="text-left font-semibold hover:no-underline text-lg">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground text-base leading-relaxed pb-4">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </section>
      )}

      {/* Final CTA */}
      <section className="py-24 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
        <div className="container mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              Ready to streamline your {module.name.toLowerCase()}?
            </h2>
            <p className="text-primary-foreground/90 max-w-2xl mx-auto mb-10 text-xl">
              Start your free trial today—no credit card required. See for yourself why shops are making the switch.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" variant="secondary" className="text-lg px-10">
                <Link to="/staff-login">
                  Start Your Free Trial
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 text-lg px-10"
              >
                <Link to="/#modules">Explore Other Modules</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}