const Invitation = require("../models/Invitation");
const Trip = require("../models/Trip");

class InvitationService {
  // Get invitation by token
  async getByToken(token) {
    const invitation = await Invitation.findOne({
      invitationToken: token,
      status: "pending",
    }).populate("tripId", "name destination wetuLink");

    if (!invitation) {
      throw new Error("Invitation not found or already used");
    }

    if (invitation.isExpired()) {
      throw new Error("Invitation has expired");
    }

    return invitation;
  }

  // Accept invitation when user registers
  async acceptInvitation(token, userId) {
    const invitation = await this.getByToken(token);

    invitation.status = "accepted";
    invitation.userId = userId;
    invitation.acceptedAt = new Date();
    await invitation.save();

    // The invitation is how someone who had no account yet gets assigned the
    // trip. Every query that shows a custom trip gates on assignedUserIds, so
    // without this the trip stays invisible to the person invited to it.
    // getByToken populates tripId, so this is the trip document, not an id.
    if (invitation.tripId) {
      await Trip.updateOne(
        { _id: invitation.tripId._id || invitation.tripId },
        { $addToSet: { assignedUserIds: userId } }
      );
    }

    return invitation;
  }

  // The emailed link carries a token, but someone can just as easily type their
  // address into the register form instead. Both paths have to land them on the
  // trip, so pending invitations are also matched by email at signup.
  async acceptPendingByEmail(email, userId) {
    const invitations = await this.getPendingByEmail(email);
    const accepted = [];

    for (const invitation of invitations) {
      if (invitation.isExpired()) continue;

      invitation.status = "accepted";
      invitation.userId = userId;
      invitation.acceptedAt = new Date();
      await invitation.save();

      if (invitation.tripId) {
        await Trip.updateOne(
          { _id: invitation.tripId._id || invitation.tripId },
          { $addToSet: { assignedUserIds: userId } }
        );
      }

      accepted.push(invitation);
    }

    return accepted;
  }

  // Get all accepted invitations for a user
  async getUserTrips(userId) {
    return await Invitation.find({
      userId,
      status: "accepted",
    }).populate("tripId", "name destination wetuLink price pricing isActive");
  }

  // Check if user has any pending invitations
  async getPendingByEmail(email) {
    return await Invitation.find({
      email: email.toLowerCase(),
      status: "pending",
    })
      .populate("tripId", "name destination wetuLink")
      .sort({ createdAt: -1 });
  }
}

module.exports = new InvitationService();
