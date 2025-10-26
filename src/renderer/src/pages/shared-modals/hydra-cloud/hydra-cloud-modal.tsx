import { Modal } from "@renderer/components";
import { useTranslation } from "react-i18next";
import "./hydra-cloud-modal.scss";

export interface HydraCloudModalProps {
  feature: string;
  visible: boolean;
  onClose: () => void;
}

/**
 * Cloud Features Modal
 * 
 * This modal has been stubbed out - it was originally for Hydra subscription features.
 * You can implement your own premium/cloud features here if needed.
 */
export const HydraCloudModal = ({
  feature,
  visible,
  onClose,
}: HydraCloudModalProps) => {
  const { t } = useTranslation("hydra_cloud");

  return (
    <Modal visible={visible} title={t("hydra_cloud")} onClose={onClose}>
      <div
        className="hydra-cloud-modal__container"
        data-hydra-cloud-feature={feature}
      >
        {t("hydra_cloud_feature_found")}
      </div>
    </Modal>
  );
};
