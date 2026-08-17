"use client";

import { useState } from "react";
import DOMPurify from "isomorphic-dompurify";

import { ServiceOffering } from "src/types/serviceOffering";

import APIDocumentation from "../APIDocumentation/APIDocumentation";
import CardWithTitle from "../Card/CardWithTitle";
import { Tab, Tabs } from "../Tab/Tab";

type CurrentTab = "plan-details" | "documentation" | "pricing" | "support" | "api-documentation";

type ServicePlanDetailsProps = {
  serviceOffering?: ServiceOffering;
  startingTab?: CurrentTab;
};

const tabLabels: Record<CurrentTab, string> = {
  "plan-details": "Plan Details",
  documentation: "Documentation",
  pricing: "Pricing",
  support: "Support",
  "api-documentation": "API Documentation",
  // "download-cli": "Download CLI",
};

const ServicePlanDetails: React.FC<ServicePlanDetailsProps> = ({ serviceOffering, startingTab = "plan-details" }) => {
  const [currentTab, _] = useState<CurrentTab>(startingTab);

  if (!serviceOffering) return null;

  return (
    <CardWithTitle title={serviceOffering.productTierName}>
      <Tabs
        value={currentTab}
        centerTabs
        wrapperSx={{
          mb: "32px",
        }}
      >
        {(Object.keys(tabLabels) as CurrentTab[]).map((tab) => (
          <Tab
            key={tab}
            label={tabLabels[tab]}
            value={tab}
            onClick={() => {
              if (tab === "api-documentation") {
                window.open("https://docs.falkordb.com/cloud/api-reference/introduction", "_blank");
              }
              if (tab === "documentation") {
                window.open("https://docs.falkordb.com/cloud", "_blank");
              }
              if (tab === "pricing") {
                window.open("https://docs.falkordb.com/cloud/tiers/pro", "_blank");
              }
              if (tab === "support") {
                window.open("https://falkordb.com/support", "_blank");
              }
              if (tab === "plan-details") {
                window.open(
                  `https://docs.falkordb.com/cloud/tiers/${serviceOffering.productTierName.toLowerCase().split(" ").pop()}`,
                  "_blank"
                );
              }
            }}
            disableRipple
          />
        ))}
      </Tabs>

      {["plan-details", "documentation", "pricing", "support"].includes(currentTab) && (
        <CardWithTitle title={tabLabels[currentTab]} style={{ minHeight: "500px" }}>
          <div className="ql-snow">
            <div
              className={"ql-editor"}
              style={{ wordBreak: "break-word" }}
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(
                  currentTab === "plan-details"
                    ? serviceOffering.productTierPlanDescription
                    : currentTab === "documentation"
                      ? serviceOffering.productTierDocumentation
                      : currentTab === "pricing"
                        ? // @ts-ignore
                          serviceOffering.productTierPricing?.value
                        : currentTab === "support"
                          ? serviceOffering.productTierSupport
                          : "",
                  {
                    ALLOWED_TAGS: [
                      "b",
                      "i",
                      "em",
                      "strong",
                      "a",
                      "p",
                      "ul",
                      "ol",
                      "li",
                      "br",
                      "code",
                      "pre",
                      "h1",
                      "h2",
                      "h3",
                      "blockquote",
                      "span",
                    ],
                    ALLOWED_ATTR: ["href", "target", "rel", "class"],
                    ALLOWED_URI_REGEXP: /^(https?:|mailto:|\/)/i,
                  }
                ),
              }}
            />
          </div>
        </CardWithTitle>
      )}

      {currentTab === "api-documentation" && (
        <APIDocumentation serviceId={serviceOffering.serviceId} serviceAPIID={serviceOffering.serviceAPIID} />
      )}
    </CardWithTitle>
  );
};

export default ServicePlanDetails;
